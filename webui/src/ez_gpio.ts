export const PULL_FL = 0;
export const PULL_PU = 1;
export const PULL_PD = 2;
export const PULL_BK = 3;
export type GpioState = {
  pull: 0 | 1 | 2 | 3;
  isOutput: boolean;
  value: boolean;
};

function buildOutputReport(gpios: GpioState[]): ArrayBuffer {
  let direction = 0;
  let pull_0 = 0;
  let pull_1 = 0;
  let output = 0;
  for (let i = 0; i < 16; ++i) {
    direction |= gpios[i].isOutput ? 1 << i : 0;
    pull_0 |= gpios[i].pull << (i * 2);
    output |= gpios[i].value ? 1 << i : 0;
  }
  for (let i = 16; i < 32; ++i) {
    direction |= gpios[i].isOutput ? 1 << i : 0;
    pull_1 |= gpios[i].pull << ((i - 16) * 2);
    output |= gpios[i].value ? 1 << i : 0;
  }
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  view.setUint32(0, direction, true);
  view.setUint32(4, pull_0, true);
  view.setUint32(8, pull_1, true);
  view.setUint32(12, output, true);
  return buffer;
}

function applyInputReport(gpios: GpioState[], report: DataView): GpioState[] {
  const u32le = report.getUint32(0, true);
  return gpios.map((gpio, idx) => {
    if (gpio.isOutput) {
      return gpio;
    }
    const value = ((u32le >> idx) & 1) === 1;
    return {
      ...gpio,
      value,
    };
  });
}

export class EzGpio {
  private isConnecting = false;
  private hid: HIDDevice | null = null;
  public onInput: (apply: (gpios: GpioState[]) => GpioState[]) => void = () => {};

  get isConnected() {
    return this.hid !== null;
  }

  async connect() {
    if (this.hid !== null) {
      throw new Error("Already connected");
    }
    if (this.isConnecting) {
      throw new Error("Already connecting");
    }
    this.isConnecting = true;
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: 0x6666, productId: 0x6910 }],
      });
      if (devices.length === 0) {
        throw new Error("No device found");
      }
      this.hid = devices[0];
      this.hid.addEventListener("inputreport", this.handleInputReport);
      this.hid.addEventListener("disconnect", this.handleDisconnect);
      await this.hid.open();
    } finally {
      this.isConnecting = false;
    }
  }

  handleInputReport = (e: HIDInputReportEvent) => {
    if (e.data.byteLength !== 4) {
      return;
    }
    const apply = (gpios: GpioState[]): GpioState[] => {
      return applyInputReport(gpios, e.data);
    };
    this.onInput(apply);
  };

  handleDisconnect = () => {
    this.disconnect();
  };

  disconnect() {
    this.hid?.removeEventListener("inputreport", this.handleInputReport);
    this.hid?.close();
    this.hid = null;
  }

  async sendState(gpios: GpioState[]) {
    if (this.hid === null) {
      throw new Error("Not connected");
    }
    const report = buildOutputReport(gpios);
    await this.hid.sendReport(0, report);
  }
}

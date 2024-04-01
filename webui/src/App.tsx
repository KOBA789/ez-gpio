import React, { FC, useCallback, useEffect, useState } from "react";
import RpiPico from "./rpi_pico.svg";
import { EzGpio, GpioState, PULL_FL } from "./ez_gpio";

function repeat<T>(n: number, fn: (i: number) => T): T[] {
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(fn(i));
  }
  return result;
}

type BasePad = {
  id: number;
  label: string;
};
type GpioPad = BasePad & {
  gpio: number;
};
type Pad = GpioPad | BasePad;

const PADS: Pad[] = [
  { id: 1, label: "GP0", gpio: 0 },
  { id: 2, label: "GP1", gpio: 1 },
  { id: 3, label: "GND" },
  { id: 4, label: "GP2", gpio: 2 },
  { id: 5, label: "GP3", gpio: 3 },
  { id: 6, label: "GP4", gpio: 4 },
  { id: 7, label: "GP5", gpio: 5 },
  { id: 8, label: "GND" },
  { id: 9, label: "GP6", gpio: 6 },
  { id: 10, label: "GP7", gpio: 7 },
  { id: 11, label: "GP8", gpio: 8 },
  { id: 12, label: "GP9", gpio: 9 },
  { id: 13, label: "GND" },
  { id: 14, label: "GP10", gpio: 10 },
  { id: 15, label: "GP11", gpio: 11 },
  { id: 16, label: "GP12", gpio: 12 },
  { id: 17, label: "GP13", gpio: 13 },
  { id: 18, label: "GND" },
  { id: 19, label: "GP14", gpio: 14 },
  { id: 20, label: "GP15", gpio: 15 },
  { id: 21, label: "GP16", gpio: 16 },
  { id: 22, label: "GP17", gpio: 17 },
  { id: 23, label: "GND" },
  { id: 24, label: "GP18", gpio: 18 },
  { id: 25, label: "GP19", gpio: 19 },
  { id: 26, label: "GP20", gpio: 20 },
  { id: 27, label: "GP21", gpio: 21 },
  { id: 28, label: "GND" },
  { id: 29, label: "GP22", gpio: 22 },
  { id: 30, label: "RUN" },
  { id: 31, label: "GP26", gpio: 26 },
  { id: 32, label: "GP27", gpio: 27 },
  { id: 33, label: "AGND" },
  { id: 34, label: "GP28", gpio: 28 },
  { id: 35, label: "VREF" },
  { id: 36, label: "3V3" },
  { id: 37, label: "3V3 EN" },
  { id: 38, label: "GND" },
  { id: 39, label: "VSYS" },
  { id: 40, label: "VBUS" },
];

const LEFT_PADS = PADS.slice(0, 20);
const RIGHT_PADS = PADS.slice(20).reverse();

const PULL_LABELS = ["FL", "PU", "PD", "BK"] as const;

type LabelCellProps = {
  children: string;
  isGpio: boolean;
};
const LabelCell: FC<LabelCellProps> = ({ children, isGpio }) => {
  if (isGpio) {
    return <td className="h-[20px] w-[60px] px-1 bg-green-200">{children}</td>;
  } else {
    return <td className="h-[20px] w-[60px] px-1 bg-gray-200">{children}</td>;
  }
};

type PadNumberCellProps = {
  children: number;
};
const PadNumberCell: FC<PadNumberCellProps> = ({ children }) => {
  return (
    <td className="h-[20px] w-[20px] text-center text-[12px] bg-gray-200 text-gray-800">
      {children}
    </td>
  );
};

type ValueButtonCellProps = {
  value: boolean;
  onClick: () => void;
};
const ValueButtonCell: FC<ValueButtonCellProps> = ({ value, onClick }) => {
  const colorClassNames = value
    ? "bg-blue-600 hover:bg-blue-500 text-white"
    : "bg-blue-100 hover:bg-blue-200 text-blue-900";
  return (
    <td className="h-[20px] w-[20px] p-0">
      <button
        className={`block border-0 h-full w-full text-center text-[12px] font-bold rounded ${colorClassNames}`}
        onClick={onClick}
      >
        {value ? "H" : "L"}
      </button>
    </td>
  );
};

type ValueDisplayCellProps = {
  value: boolean;
};
const ValueDisplayCell: FC<ValueDisplayCellProps> = ({ value }) => {
  const colorClassNames = value
    ? "bg-blue-600 text-white"
    : "bg-blue-100 text-blue-900";
  return (
    <td
      className={`h-[20px] w-[20px] border-0 text-center text-[12px] font-bold ${colorClassNames}`}
    >
      {value ? "H" : "L"}
    </td>
  );
};

type PullCellProps = {
  pull: GpioState["pull"];
  onClick: () => void;
  onRightClick: (e: React.SyntheticEvent) => void;
};
const PullCell: FC<PullCellProps> = ({ pull, onClick, onRightClick }) => {
  return (
    <td className="h-[20px] w-[20px] p-0">
      <button
        className={`block border-0 h-full w-full text-center text-[12px] font-bold rounded bg-gray-300 hover:bg-gray-200 text-gray-900`}
        onClick={onClick}
        onContextMenu={onRightClick}
      >
        {PULL_LABELS[pull]}
      </button>
    </td>
  );
};

type ArrowProps = {
  isLeft: boolean;
};
const Arrow: FC<ArrowProps> = ({ isLeft }) => {
  return (
    <svg
      height="20"
      width="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={isLeft ? "scale-x-[-1]" : ""}
    >
      <path d="M19 12H5"></path>
      <path d="M12 19l-7-7 7-7"></path>
    </svg>
  );
};

type DirectionCellProps = {
  isOutput: boolean;
  isRtl: boolean;
  onClick: () => void;
};
const DirectionCell: FC<DirectionCellProps> = ({
  isOutput,
  isRtl,
  onClick,
}) => {
  return (
    <td className="h-[20px] w-[20px] p-0">
      <button
        className={`block h-full w-full text-center rounded bg-gray-300 hover:bg-gray-200 text-gray-900`}
        onClick={onClick}
      >
        <Arrow isLeft={isOutput === isRtl} />
      </button>
    </td>
  );
};

function cyclePull(
  pull: GpioState["pull"],
  reverse: boolean = false
): GpioState["pull"] {
  if (reverse) {
    return ((pull + 3) % 4) as GpioState["pull"];
  } else {
    return ((pull + 1) % 4) as GpioState["pull"];
  }
}

type GpioPadRowProps = {
  pad: GpioPad;
  state: GpioState;
  isRtl: boolean;
  onChangeGpioState: (gpio: number, state: GpioState) => void;
};
const GpioPadRow: FC<GpioPadRowProps> = ({
  pad,
  state,
  isRtl,
  onChangeGpioState,
}) => {
  const handlePullClick = useCallback(() => {
    onChangeGpioState(pad.gpio, {
      ...state,
      pull: cyclePull(state.pull),
    });
  }, [onChangeGpioState, pad.gpio, state]);
  const handlePullRightClick = useCallback(
    (e: React.SyntheticEvent) => {
      onChangeGpioState(pad.gpio, {
        ...state,
        pull: cyclePull(state.pull, true),
      });
      e.preventDefault();
    },
    [onChangeGpioState, pad.gpio, state]
  );
  const handleDirectionClick = useCallback(() => {
    onChangeGpioState(pad.gpio, {
      ...state,
      isOutput: !state.isOutput,
    });
  }, [onChangeGpioState, pad.gpio, state]);
  const handleValueClick = useCallback(() => {
    onChangeGpioState(pad.gpio, {
      ...state,
      value: !state.value,
    });
  }, [onChangeGpioState, pad.gpio, state]);
  return (
    <tr>
      <PadNumberCell>{pad.id}</PadNumberCell>
      <LabelCell isGpio={true}>{pad.label}</LabelCell>
      <PullCell
        pull={state.pull}
        onClick={handlePullClick}
        onRightClick={handlePullRightClick}
      />
      <DirectionCell
        isOutput={state.isOutput}
        isRtl={isRtl}
        onClick={handleDirectionClick}
      />
      {state.isOutput ? (
        <ValueButtonCell value={state.value} onClick={handleValueClick} />
      ) : (
        <ValueDisplayCell value={state.value} />
      )}
    </tr>
  );
};

type NonGpioPadRowProps = {
  pad: BasePad;
};
const NonGpioPadRow: FC<NonGpioPadRowProps> = ({ pad }) => {
  return (
    <tr>
      <PadNumberCell>{pad.id}</PadNumberCell>
      <LabelCell isGpio={"gpio" in pad}>{pad.label}</LabelCell>
      <td colSpan={3} />
    </tr>
  );
};

type PadsTableProps = {
  pads: Pad[];
  dir: "rtl" | "ltr";
  gpios: GpioState[];
  onChangeGpioState: (gpio: number, state: GpioState) => void;
};
const PadsTable: FC<PadsTableProps> = ({
  pads,
  dir,
  gpios,
  onChangeGpioState,
}) => {
  return (
    <table
      className="mt-[18.65px] mb-[3.025px] border-separate border-spacing-[5px] align-middle text-[12px] font-mono"
      dir={dir}
    >
      <tbody dir="ltr">
        {pads.map((pad) => {
          if ("gpio" in pad) {
            return (
              <GpioPadRow
                key={pad.id}
                pad={pad}
                state={gpios[pad.gpio]}
                isRtl={dir === "rtl"}
                onChangeGpioState={onChangeGpioState}
              />
            );
          } else {
            return <NonGpioPadRow key={pad.id} pad={pad} />;
          }
        })}
      </tbody>
    </table>
  );
};

const useEzGpio = (
  onInput: (apply: (gpios: GpioState[]) => GpioState[]) => void
) => {
  const [ezGpio, setEzGpio] = useState<EzGpio | null>(null);
  useEffect(() => {
    const ezGpio = new EzGpio();
    setEzGpio(ezGpio);
    return () => {
      ezGpio?.disconnect();
    };
  }, []);
  useEffect(() => {
    if (ezGpio === null) {
      return;
    }
    ezGpio.onInput = onInput;
  }, [ezGpio, onInput]);
  const connectToDevice = useCallback(() => {
    if (ezGpio === null) {
      return;
    }
    ezGpio.connect();
  }, [ezGpio]);
  const sendState = useCallback(
    (gpios: GpioState[]) => {
      if (ezGpio === null) {
        return;
      }
      ezGpio.sendState(gpios);
    },
    [ezGpio]
  );
  const isConnected = ezGpio !== null && ezGpio.isConnected;
  return {
    isConnected,
    connectToDevice,
    sendState,
  };
};

export const App: React.FC = () => {
  const [gpios, setGpios] = React.useState<GpioState[]>(() => {
    return repeat(32, () => ({ pull: PULL_FL, isOutput: false, value: false }));
  });
  const { connectToDevice, sendState, isConnected } = useEzGpio(setGpios);
  const handleClickConnect = useCallback(async () => {
    await connectToDevice();
    sendState(gpios);
  }, [connectToDevice, gpios, sendState]);
  const handleChangeGpioState = useCallback(
    (gpio: number, state: GpioState) => {
      setGpios((gpios) => {
        const newGpios = [...gpios];
        newGpios[gpio] = state;
        sendState(newGpios);
        return newGpios;
      });
    },
    [sendState]
  );
  return (
    <>
      <div className="h-screen grid place-content-center relative">
        <div className="flex flex-row h-[521.65px]">
          <PadsTable
            pads={LEFT_PADS}
            dir="ltr"
            gpios={gpios}
            onChangeGpioState={handleChangeGpioState}
          />
          <img src={RpiPico} alt="Raspberry Pi Pico" className="block h-full" />
          <PadsTable
            pads={RIGHT_PADS}
            dir="rtl"
            gpios={gpios}
            onChangeGpioState={handleChangeGpioState}
          />
          {!isConnected && (
            <div className="absolute top-0 left-0 right-0 bottom-0 grid place-content-center backdrop-grayscale backdrop-blur-sm">
              <button
                className="px-3 py-1 rounded border border-blue-600 bg-blue-500 hover:bg-blue-600 active:outline text-white"
                onClick={handleClickConnect}
              >
                Connect
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

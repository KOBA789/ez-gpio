#![no_main]
#![no_std]

use ez_gpio as _;

// global logger + panicking-behavior + memory layout
use rp_pico::{
    entry,
    hal::{
        self,
        gpio::{
            bank0::{
                Gpio0, Gpio1, Gpio10, Gpio11, Gpio12, Gpio13, Gpio14, Gpio15, Gpio16, Gpio17,
                Gpio18, Gpio19, Gpio2, Gpio20, Gpio21, Gpio22, Gpio26, Gpio27, Gpio28, Gpio3,
                Gpio4, Gpio5, Gpio6, Gpio7, Gpio8, Gpio9,
            },
            DynPullType, FunctionPio0, Pin,
        },
        pio::{PIOExt as _, PinDir},
        usb::UsbBus,
        Sio,
    },
    pac,
};
use usb_device::{class_prelude::UsbBusAllocator, prelude::*};
use usbd_hid::descriptor::generator_prelude::*;
use usbd_hid::hid_class::{
    HIDClass, HidClassSettings, HidCountryCode, HidProtocol, HidSubClass, ProtocolModeConfig,
};
use zerocopy::{little_endian::U32, AsBytes, FromBytes, FromZeroes};

#[gen_hid_descriptor(
    (collection = APPLICATION, usage_page = VENDOR_DEFINED_START, usage = 0x01) = {
        direction=output;
        pull_0=output;
        pull_1=output;
        output=output;
        input=input;
    }
)]
struct CustomReport {
    direction: [u8; 4],
    pull_0: [u8; 4],
    pull_1: [u8; 4],
    output: [u8; 4],
    input: [u8; 4],
}

#[derive(FromZeroes, FromBytes)]
#[repr(C)]
struct OutputReport {
    direction: U32,
    pull_0: U32,
    pull_1: U32,
    output: U32,
}

#[derive(FromZeroes, AsBytes)]
#[repr(C)]
struct InputReport {
    input: U32,
}

#[derive(Default)]
struct State {
    direction: u32,
    pull_0: u32,
    pull_1: u32,
    output: u32,
    input: u32,
}

impl State {
    pub fn update_output(&mut self, output_report: &OutputReport) -> (bool, bool) {
        self.direction = output_report.direction.into();
        self.output = output_report.output.into();

        let (mut is_0_changed, mut is_1_changed) = (false, false);

        let new_pull_0 = output_report.pull_0.into();
        if self.pull_0 != new_pull_0 {
            is_0_changed = true;
        }
        self.pull_0 = new_pull_0;

        let new_pull_1 = output_report.pull_1.into();
        if self.pull_1 != new_pull_1 {
            is_1_changed = true;
        }
        self.pull_1 = new_pull_1;

        (is_0_changed, is_1_changed)
    }

    pub fn input_report(&self) -> InputReport {
        InputReport {
            input: self.input.into(),
        }
    }
}

struct Pins {
    gp0: Pin<Gpio0, FunctionPio0, DynPullType>,
    gp1: Pin<Gpio1, FunctionPio0, DynPullType>,
    gp2: Pin<Gpio2, FunctionPio0, DynPullType>,
    gp3: Pin<Gpio3, FunctionPio0, DynPullType>,
    gp4: Pin<Gpio4, FunctionPio0, DynPullType>,
    gp5: Pin<Gpio5, FunctionPio0, DynPullType>,
    gp6: Pin<Gpio6, FunctionPio0, DynPullType>,
    gp7: Pin<Gpio7, FunctionPio0, DynPullType>,
    gp8: Pin<Gpio8, FunctionPio0, DynPullType>,
    gp9: Pin<Gpio9, FunctionPio0, DynPullType>,
    gp10: Pin<Gpio10, FunctionPio0, DynPullType>,
    gp11: Pin<Gpio11, FunctionPio0, DynPullType>,
    gp12: Pin<Gpio12, FunctionPio0, DynPullType>,
    gp13: Pin<Gpio13, FunctionPio0, DynPullType>,
    gp14: Pin<Gpio14, FunctionPio0, DynPullType>,
    gp15: Pin<Gpio15, FunctionPio0, DynPullType>,
    gp16: Pin<Gpio16, FunctionPio0, DynPullType>,
    gp17: Pin<Gpio17, FunctionPio0, DynPullType>,
    gp18: Pin<Gpio18, FunctionPio0, DynPullType>,
    gp19: Pin<Gpio19, FunctionPio0, DynPullType>,
    gp20: Pin<Gpio20, FunctionPio0, DynPullType>,
    gp21: Pin<Gpio21, FunctionPio0, DynPullType>,
    gp22: Pin<Gpio22, FunctionPio0, DynPullType>,
    gp26: Pin<Gpio26, FunctionPio0, DynPullType>,
    gp27: Pin<Gpio27, FunctionPio0, DynPullType>,
    gp28: Pin<Gpio28, FunctionPio0, DynPullType>,
}

fn to_dyn_pull_type(bits: u32, n: usize) -> DynPullType {
    match (bits >> (n * 2)) & 0b11 {
        0b00 => DynPullType::None,
        0b01 => DynPullType::Up,
        0b10 => DynPullType::Down,
        0b11 => DynPullType::BusKeep,
        _ => unreachable!(),
    }
}

impl Pins {
    pub fn update_pull_0(&mut self, pull_0: u32) {
        self.gp0.set_pull_type(to_dyn_pull_type(pull_0, 0));
        self.gp1.set_pull_type(to_dyn_pull_type(pull_0, 1));
        self.gp2.set_pull_type(to_dyn_pull_type(pull_0, 2));
        self.gp3.set_pull_type(to_dyn_pull_type(pull_0, 3));
        self.gp4.set_pull_type(to_dyn_pull_type(pull_0, 4));
        self.gp5.set_pull_type(to_dyn_pull_type(pull_0, 5));
        self.gp6.set_pull_type(to_dyn_pull_type(pull_0, 6));
        self.gp7.set_pull_type(to_dyn_pull_type(pull_0, 7));
        self.gp8.set_pull_type(to_dyn_pull_type(pull_0, 8));
        self.gp9.set_pull_type(to_dyn_pull_type(pull_0, 9));
        self.gp10.set_pull_type(to_dyn_pull_type(pull_0, 10));
        self.gp11.set_pull_type(to_dyn_pull_type(pull_0, 11));
        self.gp12.set_pull_type(to_dyn_pull_type(pull_0, 12));
        self.gp13.set_pull_type(to_dyn_pull_type(pull_0, 13));
        self.gp14.set_pull_type(to_dyn_pull_type(pull_0, 14));
        self.gp15.set_pull_type(to_dyn_pull_type(pull_0, 15));
    }

    pub fn update_pull_1(&mut self, pull_1: u32) {
        self.gp16.set_pull_type(to_dyn_pull_type(pull_1, 0));
        self.gp17.set_pull_type(to_dyn_pull_type(pull_1, 1));
        self.gp18.set_pull_type(to_dyn_pull_type(pull_1, 2));
        self.gp19.set_pull_type(to_dyn_pull_type(pull_1, 3));
        self.gp20.set_pull_type(to_dyn_pull_type(pull_1, 4));
        self.gp21.set_pull_type(to_dyn_pull_type(pull_1, 5));
        self.gp22.set_pull_type(to_dyn_pull_type(pull_1, 6));
        self.gp26.set_pull_type(to_dyn_pull_type(pull_1, 10));
        self.gp27.set_pull_type(to_dyn_pull_type(pull_1, 11));
        self.gp28.set_pull_type(to_dyn_pull_type(pull_1, 12));
    }
}

#[entry]
fn entry() -> ! {
    let mut pac = pac::Peripherals::take().unwrap();
    let mut watchdog = hal::Watchdog::new(pac.WATCHDOG);
    let clocks = hal::clocks::init_clocks_and_plls(
        rp_pico::XOSC_CRYSTAL_FREQ,
        pac.XOSC,
        pac.CLOCKS,
        pac.PLL_SYS,
        pac.PLL_USB,
        &mut pac.RESETS,
        &mut watchdog,
    )
    .ok()
    .unwrap();

    let sio = Sio::new(pac.SIO);
    let pins = rp_pico::Pins::new(
        pac.IO_BANK0,
        pac.PADS_BANK0,
        sio.gpio_bank0,
        &mut pac.RESETS,
    );

    let (mut pio, sm0, _, _, _) = pac.PIO0.split(&mut pac.RESETS);

    let mut pins = Pins {
        gp0: pins.gpio0.reconfigure(),
        gp1: pins.gpio1.reconfigure(),
        gp2: pins.gpio2.reconfigure(),
        gp3: pins.gpio3.reconfigure(),
        gp4: pins.gpio4.reconfigure(),
        gp5: pins.gpio5.reconfigure(),
        gp6: pins.gpio6.reconfigure(),
        gp7: pins.gpio7.reconfigure(),
        gp8: pins.gpio8.reconfigure(),
        gp9: pins.gpio9.reconfigure(),
        gp10: pins.gpio10.reconfigure(),
        gp11: pins.gpio11.reconfigure(),
        gp12: pins.gpio12.reconfigure(),
        gp13: pins.gpio13.reconfigure(),
        gp14: pins.gpio14.reconfigure(),
        gp15: pins.gpio15.reconfigure(),
        gp16: pins.gpio16.reconfigure(),
        gp17: pins.gpio17.reconfigure(),
        gp18: pins.gpio18.reconfigure(),
        gp19: pins.gpio19.reconfigure(),
        gp20: pins.gpio20.reconfigure(),
        gp21: pins.gpio21.reconfigure(),
        gp22: pins.gpio22.reconfigure(),
        gp26: pins.gpio26.reconfigure(),
        gp27: pins.gpio27.reconfigure(),
        gp28: pins.gpio28.reconfigure(),
    };

    let bus = UsbBus::new(
        pac.USBCTRL_REGS,
        pac.USBCTRL_DPRAM,
        clocks.usb_clock,
        true,
        &mut pac.RESETS,
    );
    let bus_allocator = UsbBusAllocator::new(bus);
    let vid_pid = UsbVidPid(0x6666, 0x6910);
    let mut hid = HIDClass::new_with_settings(
        &bus_allocator,
        CustomReport::desc(),
        16,
        HidClassSettings {
            subclass: HidSubClass::NoSubClass,
            protocol: HidProtocol::Generic,
            config: ProtocolModeConfig::ForceReport,
            locale: HidCountryCode::NotSupported,
        },
    );
    let mut dev = UsbDeviceBuilder::new(&bus_allocator, vid_pid)
        .max_packet_size_0(64)
        .manufacturer("KOBA789")
        .product("EZ-GPIO")
        .build();

    let pio_pg = pio_proc::pio_asm! {
        ".wrap_target",
        "pull block",
        "out pindirs, 32",
        "pull block",
        "out pins, 32",
        "in pins, 30",
        "push block",
        ".wrap",
    };
    let installed = pio.install(&pio_pg.program).unwrap();
    let (mut sm, mut rx, mut tx) = hal::pio::PIOBuilder::from_program(installed)
        .in_pin_base(0)
        .out_pins(0, 32)
        .clock_divisor_fixed_point(12500, 0)
        .build(sm0);
    sm.set_pindirs((0..32).map(|id| (id, PinDir::Input)));
    sm.start();

    let mut state = State::default();
    let mut usbbuf = [0x00; 64];

    loop {
        //defmt::println!(" IN: {:032b}", state.input);
        //defmt::println!("OUT: {:032b}", state.output);
        while !tx.write(state.direction) {}
        while !tx.write(state.output) {}
        loop {
            if let Some(new_input) = rx.read() {
                state.input = new_input;
                break;
            }
        }
        dev.poll(&mut [&mut hid]);
        if let Ok(len) = hid.pull_raw_output(&mut usbbuf) {
            if let Some(output_report) = OutputReport::ref_from(&usbbuf[..len]) {
                let (is_0_changed, is_1_changed) = state.update_output(output_report);
                if is_0_changed {
                    pins.update_pull_0(state.pull_0);
                }
                if is_1_changed {
                    pins.update_pull_1(state.pull_1);
                }
            }
        }
        hid.push_raw_input(state.input_report().as_bytes()).ok();
    }
}

# In-Cabin Installation Guide: 2024 Toyota RAV4 XSE

Specific mounting, routing, thermal isolation, and safety instructions for installing RoadGuard AI inside a 2024 Toyota RAV4 XSE.

---

## 1. Safety & Legal Principles

> **MANDATORY SAFETY BOUNDARIES**
> 1. **ZERO CAN-BUS CONNECTION**: Never tap, splice, or connect any wiring into the Toyota RAV4 CAN-bus, OBD-II port, Toyota Safety Sense 2.5/3.0 harness, or steering/braking electronics.
> 2. **NO AIRBAG INTERFERENCE**: Do not route cables across the A-pillar curtain airbag deployment paths.
> 3. **CLEAR DRIVER SIGHTLINES**: The camera mount must not obstruct the driver's forward vision as mandated by Colorado Revised Statutes (C.R.S. 42-4-201).
> 4. **INDEPENDENT POWER**: Power exclusively from an external USB-C power bank.

---

## 2. Cabin Layout Diagram (2024 RAV4 XSE)

```text
               +-------------------------------------------+
               |        Windshield (Tint Band Top)         |
               |                                           |
               |     [Toyota TSS Camera]                   |
               |      +-----------------+                  |
               |      | Rearview Mirror |                  |
               |      +--------+--------+                  |
               |               |                           |
               |       [Pi Cam 3 Wide Mount]               |
               |        (Directly Below Mirror)            |
               +---------------+---------------------------+
                               | (Ribbon Cable / Flat USB)
                               v
                     Tucked under Headliner
                               |
                               v
                   Passenger A-Pillar Weatherstrip
                               |
                               v
                 Passenger Footwell / Glovebox Shelf
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
     [Raspberry Pi 5 Case]             [Anker 737 Power Bank]
  (Secured with Velcro Straps)     (Connected to 5V/5A USB-C PD)
              |
              v
       [JBL Clip 4 Speaker]
 (Mounted on Passenger Grab Handle)
```

---

## 3. Step-by-Step Installation Procedure

### Step 1: Camera Windshield Placement
1. Clean the windshield glass immediately behind and slightly below the central rearview mirror housing using isopropyl alcohol.
2. Attach the heavy-duty suction mount.
3. Align the Camera Module 3 lens so that it sits horizontally level with the road horizon and is centered with the vehicle centerline.
4. Verify that the camera view sits cleanly in the wiped area of the windshield wipers (for rain/snow clearing).

### Step 2: Cable Management (Airbag-Safe Routing)
1. Route the flat camera ribbon or thin USB cable up into the gap between the windshield glass and the headliner fabric.
2. Direct the wire towards the **passenger side**.
3. **DO NOT cross the A-pillar airbag seam**. Tuck the wire behind the soft rubber door weatherstripping down the door jamb.
4. Bring the wire into the side of the glovebox compartment.

### Step 3: Pi 5 & Power Bank Securing
1. Place the Raspberry Pi 5 in an aluminum vented enclosure with the Active Cooler.
2. Place the Pi 5 and the Anker 737 power bank on the flat shelf above the glove compartment or in the lower passenger footwell tray.
3. Secure both items using reusable Velcro tie-downs to prevent sliding during mountain switchbacks.

### Step 4: Speaker Placement
1. Clip the JBL Clip 4 or compact speaker to the passenger grab handle or place it in the center console cupholder.
2. Ensure audio volume is clearly audible over road noise at 65 MPH without being jarring.

### Step 5: Clean System Removal
To remove the system (e.g. at the end of the trip), simply release the suction lever on the windshield mount and unplug the USB-C power bank cable. No adhesive residues, modified wires, or trim alterations remain in the vehicle.

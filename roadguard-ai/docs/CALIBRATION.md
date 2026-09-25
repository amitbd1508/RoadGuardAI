# Camera Mount Calibration & Optical Geometry

Calibration guide for forward perspective monocular distance estimation on the 2024 Toyota RAV4 XSE.

---

## 1. Physical Camera Placement
- **Location**: Windshield upper center behind rearview mirror.
- **Ground Clearance ($H_{cam}$)**: 1.35 meters (measured from road surface to lens center).
- **Pitch Angle ($\theta$)**: -2.5° (tilted slightly downwards towards the road horizon).
- **Horizontal Field of View**: 75.0° (Pi Camera Module 3 Wide optical center).

---

## 2. Distance Estimation Math (Pinhole & Ground Plane)

The distance $D$ to the road contact point of an object at vertical pixel coordinate $y_{bottom}$ is determined by:

$$\alpha = \arctan\left(\frac{y_{bottom} - y_{center}}{f_y}\right)$$

$$D \approx \frac{H_{cam}}{\tan(\alpha + \theta_{pitch})}$$

For distant objects above the ground horizon threshold, RoadGuard AI fuses the ground plane calculation with the bounding box height prior:

$$D_{size} \approx \frac{H_{physical} \times f_y}{h_{bbox}}$$

The dashboard displays distances as approximate integers (e.g. `~25m`) to reinforce that camera perception is strictly advisory.

---

## 3. Interactive Calibration Tool

Run the calibration utility from terminal:

```bash
roadguard --calibrate-camera
```
Adjust parameters in `config.yaml` until the horizontal road horizon aligns with the HUD centerline when parked on a level surface.

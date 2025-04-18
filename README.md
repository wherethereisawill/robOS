# robOS

WIP!!!
👉 https://rob-os.netlify.app 👈

## TODO

- Proof of concept:
    - [x] Connect to servo from usb.
    - [x] Read position from servo via usb.
    - [x] Connect & read camera
    - [x] Record dataset.
    - [x] Upload dataset to HF space.
    - [x] Train policy on remote GPU.
    - [ ] Run inference on remote GPU.

- MVP:
    - [x] Home
        - [x] Title.
        - [x] Tabs.
    - [ ] Setup tab
        - [x] Add/remove robot.
        - [x] Add/remove camera.
    - [ ] Teleop
        - [x] Read position of leader.
        - [x] Write position of follower.
        - [ ] Enable/disable teleop.
        - [ ] View servo positions of both arms in realtime.
        - [ ] Calibrate arms.
    - [ ] Datasets
        - [ ] View existing datasets.
        - [ ] Create new dataset/episode.
    - [ ] Policies.
        - [ ] View existing policies.
        - [ ] Train a policy.
        - [ ] Link to Weights & Biases whilst training.
        - [ ] Run policy.

- v1:
    - [ ] Setup tab
        - [ ] Read servo ids, position, torque.
        - [ ] Write servo id.
    - [ ] Teleop
        - [ ] Handle disable gracefully.
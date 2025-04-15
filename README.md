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

- Build full web app:
    - [ ] Homepage
        - [x] Title
        - [x] Tabs
    - [ ] Setup tab
        - [x] Add/remove robot arm flow.
        - [ ] Add/remove camera flow.
        - [ ] Read servo ids, position, torque.
        - [ ] Write servo id.
    - [ ] Teleop
        - [ ] Choose leader/follower.
        - [ ] Enable/disable teleop (handle disable gracefully).
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
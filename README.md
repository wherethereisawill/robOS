# robot-os

## TODO

- Proof of concept:
    - [x] Connect to servo from usb.
    - [x] Read position from servo via usb.
    - [ ] Record dataset.
    - [ ] Upload dataset to HF space.
    - [ ] Train policy on remote GPU.

- Build full web app:
    - [ ] Setup tab
        - [ ] Enable USB access.
        - [ ] Read board id.
        - [ ] Read servo ids, position, torque.
        - [ ] Write servo id.
        - [ ] Config arms.
    - [ ] Teleop
        - [ ] Choose leader/follower.
        - [ ] Enable/disable teleop (handle disable gracefully).
        - [ ] View servo positions of both arms in realtime.
    - [ ] Datasets
        - [ ] View existing datasets.
        - [ ] Create new dataset/episode.
    - [ ] Policies.
        - [ ] View existing policies.
        - [ ] Train a policy.
        - [ ] Link to Weights & Biases whilst training.
        - [ ] Run policy.
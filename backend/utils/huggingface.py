from huggingface_hub import HfApi, CommitInfo # type: ignore
import pandas as pd # type: ignore
import io
import numpy as np # type: ignore

def create_hf_dataset_repo(token: str, repo_name: str, private: bool = True) -> str:
    api = HfApi(token=token)
    username = api.whoami()["name"]
    repo_id = f"{username}/{repo_name}"
    repo_url = api.create_repo(repo_id=repo_id, repo_type="dataset", private=private)
    return repo_url

def upload_episode(token: str, repo_name: str, episode_number: int, data: dict) -> CommitInfo:
    api = HfApi(token=token)
    username = api.whoami()["name"]
    repo_id = f"{username}/{repo_name}"
    path_in_repo = f"data/chunk-000/episode_{episode_number:06d}.parquet"

    df = pd.DataFrame(data)

    # Define desired data types for columns
    dtypes = {
        'observation.state': object,  # Use 'object' for sequences/lists
        'action': object,           # Use 'object' for sequences/lists
        'episode_index': np.int64,
        'frame_index': np.int64,
        'timestamp': np.float32,
        'next.done': bool,
        'index': np.int64,
        'observation.images.cam_high': object # Also handle this as object for sequence of dicts
    }
    df = df.astype(dtypes)

    buffer = io.BytesIO()
    df.to_parquet(buffer, index=False)
    buffer.seek(0)
    
    response = api.upload_file(
        path_or_fileobj=buffer,
        path_in_repo=path_in_repo,
        repo_id=repo_id,
        repo_type="dataset"
    )
    return response
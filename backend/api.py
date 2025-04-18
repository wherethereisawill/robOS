import os
from dotenv import load_dotenv # type: ignore
from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from pydantic import BaseModel # type: ignore
from utils.huggingface import create_hf_dataset_repo, upload_episode
from typing import Dict, Any, List
from lerobot.common.datasets.lerobot_dataset import LeRobotDataset # type: ignore
from tempfile import TemporaryDirectory

load_dotenv()
HF_WRITE_TOKEN = os.getenv("HF_WRITE_TOKEN")
HF_READ_TOKEN = os.getenv("HF_READ_TOKEN")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://rob-os.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/hello")
def hello_world():
    return {"message": "Hello World"}

class CreateRepoRequest(BaseModel):
    repo_name: str
    private: bool = True

@app.post("/api/create-repo")
def create_repo_endpoint(request: CreateRepoRequest):
    try:
        repo_url = create_hf_dataset_repo(HF_WRITE_TOKEN, request.repo_name, request.private)
        return {"repo_url": repo_url}
    except Exception as e:
        return {"message": f"Error creating repository: {str(e)}", "error": str(e)}
    

# class UploadEpisodeRequest(BaseModel):
#     repo_name: str
#     episode_number: int
#     data: Dict[str, Any]

# @app.post("/api/upload-episode")
# def upload_episode_endpoint(request: UploadEpisodeRequest):
#     try:
#         commit_info = upload_episode(
#             token=HF_WRITE_TOKEN,
#             repo_name=request.repo_name,
#             episode_number=request.episode_number,
#             data=request.data
#         )
#         return {"commit_info": commit_info}
#     except Exception as e:
#         return {"message": f"Error uploading episode: {str(e)}", "error": str(e)}

class RecordEpisodeRequest(BaseModel):
    repo_name: str
    fps: int
    task: str
    frames: List[Dict[str, Any]]  # one dict per frame

@app.post("/api/record-episode")
def record_episode(req: RecordEpisodeRequest):
    try:
        # Create a temporary local dataset workspace
        with TemporaryDirectory() as tmpdir:
            repo_id = f"your-hf-username/{req.repo_name}"

            # Create or resume a dataset
            dataset = LeRobotDataset.create(
                repo_id=repo_id,
                fps=req.fps,
                local_dir=tmpdir
            )

            # Add all frames
            for frame in req.frames:
                dataset.add_frame(frame)

            # Finalize the episode with its task
            dataset.add_episode(task=req.task)

            # Finalize dataset (generate metadata, compress videos, etc.)
            dataset.consolidate()

            # Push to the Hub
            dataset.push_to_hub()

        return {"status": "success", "repo_id": repo_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}
# python -m lerobot.scripts.train \
#   --dataset.repo_id=PLB/phospho-playground-mono \
#   --policy.type=act \
#   --output_dir=outputs/train/act_test_mono_7 \
#   --job_name=act_test_mono_7 \
#   --policy.device=mps \
#   --wandb.enable=true

import os
import argparse
import subprocess
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_repo_id", required=True)
    parser.add_argument("--hf_token", required=True)
    parser.add_argument("--model_name", required=True)
    parser.add_argument("--wandb_api_key", default="")
    args = parser.parse_args()

    # Set environment variables
    os.environ["HUGGINGFACE_TOKEN"] = args.hf_token
    if args.wandb_api_key:
        os.environ["WANDB_API_KEY"] = args.wandb_api_key

    # Define paths
    output_dir = f"outputs/train/{args.model_name}"
    job_name = args.model_name

    # Run the training command
    subprocess.run([
        "python", "-m", "lerobot.scripts.train",
        "--dataset.repo_id", args.dataset_repo_id,
        "--policy.type", "act",
        "--output_dir", output_dir,
        "--job_name", job_name,
        "--policy.device", "cuda",  # or "mps", but CUDA is preferred on Replicate
        "--wandb.enable", "true"
    ], check=True)

    # Push model to Hugging Face
    subprocess.run(["huggingface-cli", "login", "--token", args.hf_token], check=True)

    subprocess.run([
        "huggingface-cli", "repo", "create", args.model_name, "--type", "model", "--yes"
    ], check=True)

    model_dir = Path(output_dir) / "checkpoints" / "last"
    subprocess.run([
        "huggingface-cli", "upload", f"{args.model_name}",
        str(model_dir),
        "--repo-type", "model"
    ], check=True)

    # Output final model ID for Replicate logs
    print(f"willnorris/{args.model_name}")

if __name__ == "__main__":
    main()
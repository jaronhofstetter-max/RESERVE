#!/usr/bin/env sh
set -eu

base_model=${1:-}
if [ -z "$base_model" ] || [ ! -f "$base_model" ]; then
  echo "Usage: tools/train-expiry-tesseract-v0.sh /path/to/tessdata_best/eng.traineddata" >&2
  exit 2
fi

train_dir=training/expiry/synthetic-train
holdout_dir=training/expiry/synthetic-holdout
model_dir=training/expiry/model-v0
mkdir -p "$model_dir"

node tools/generate-synthetic-expiry-dataset.mjs "$train_dir" 2000 20260921
node tools/generate-synthetic-expiry-dataset.mjs "$holdout_dir" 300 20261022
combine_tessdata -e "$base_model" "$model_dir/eng-best.lstm"
find "$train_dir/images" -name '*.png' -print0 | xargs -0 -n1 -P8 sh -c 'img="$1"; base="${img%.png}"; env OMP_THREAD_LIMIT=1 tesseract "$img" "$base" --psm 7 lstm.train >/dev/null 2>&1' _
find "$train_dir/images" -name '*.lstmf' | sort > "$model_dir/train.list"
count=$(wc -l < "$model_dir/train.list")
if [ "$count" -lt 1900 ]; then
  echo "Too few usable LSTM samples: $count" >&2
  exit 1
fi
lstmtraining --continue_from "$model_dir/eng-best.lstm" --traineddata "$base_model" --train_listfile "$model_dir/train.list" --model_output "$model_dir/reserve-expiry-v0" --max_iterations 1000 --target_error_rate 0.01
lstmtraining --stop_training --continue_from "$model_dir/reserve-expiry-v0_checkpoint" --traineddata "$base_model" --model_output "$model_dir/reserve_expiry_v0.traineddata"
cp "$base_model" "$model_dir/eng.traineddata"
python3 tools/benchmark-synthetic-expiry-ocr.py "$holdout_dir" eng
TESSDATA_PREFIX="$model_dir" python3 tools/benchmark-synthetic-expiry-ocr.py "$holdout_dir" reserve_expiry_v0

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from processor import extract_features, validate_sequence
from gemini import classify_with_gemini
from database import init_db, save_result, get_history
import uvicorn

app = FastAPI(title="BioMatch AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

class SequenceRequest(BaseModel):
    sequence: str
    label: str = "Unknown"

@app.get("/")
def root():
    return {"message": "BioMatch AI is running 🧬"}

@app.post("/classify")
async def classify_sequence(req: SequenceRequest):
    sequence = req.sequence.strip().upper()

    is_valid, error_msg = validate_sequence(sequence)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    features = extract_features(sequence)
    result = await classify_with_gemini(sequence, features)

    save_result(sequence, req.label, result)

    return {
        "sequence": sequence,
        "label": req.label,
        "features": features,
        "classification": result
    }

@app.get("/history")
def history():
    return get_history()

@app.delete("/history")
def clear_history():
    from database import clear_all
    clear_all()
    return {"message": "History cleared"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
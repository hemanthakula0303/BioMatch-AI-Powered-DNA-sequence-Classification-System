import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

def build_prompt(sequence: str, features: dict) -> str:
    return f"""You are a world-class bioinformatics scientist and clinical genomics expert. Perform a thorough analysis of the following DNA sequence.

DNA Sequence: {sequence}

Pre-computed Features:
- Length: {features['length']} bases
- GC Content: {features['gc_content']}%
- AT Content: {features['at_content']}%
- Base Composition: {json.dumps(features['base_composition'])}
- Top 3-mer frequencies: {json.dumps(features['top_kmers'])}
- Detected repeats: {json.dumps(features['repeats'])}

You MUST respond with ONLY a raw valid JSON object. No markdown, no explanation, no backticks, no extra text. Just JSON.

Use EXACTLY this structure:
{{
  "sequence_type": "specific type e.g. Protein-Coding Exon / Promoter Region / 5-UTR / Repetitive Element / Intron / Non-coding RNA / Unknown",
  "organism_name": "specific species name e.g. Homo sapiens / Escherichia coli K-12 / Mus musculus / SARS-CoV-2",
  "organism_domain": "Bacteria / Archaea / Eukaryote / Virus / Unknown",
  "organism_details": "2-3 sentences: what this organism is, where it lives, biological significance",
  "sequence_origin": "detailed explanation of where in the genome this likely comes from",
  "is_promoter": false,
  "promoter_details": "explain if it is a promoter why, what gene it regulates, what TFs bind. If not, explain why not.",
  "gc_interpretation": "biological meaning of GC content for this organism and region type",
  "codon_analysis": "codon usage, reading frame analysis, start/stop codons detected",
  "functional_prediction": "detailed prediction of what this sequence does in the cell",
  "mutation_flags": ["specific suspicious patterns with positions if detectable"],
  "evolutionary_notes": "evolutionary conservation, homology, origin notes",
  "confidence": "85%",
  "summary": "4-5 sentence comprehensive summary covering organism, function, type, and significance",
  "current_diseases": [
    {{
      "name": "disease name",
      "type": "present / risk / associated",
      "severity": "low / moderate / high / critical",
      "description": "detailed explanation of how this sequence is linked to this disease",
      "gene_involved": "gene name if applicable"
    }}
  ],
  "future_disease_risks": [
    {{
      "name": "disease name",
      "probability": "low / moderate / high",
      "timeframe": "e.g. may manifest in 10-20 years / early onset possible",
      "description": "detailed explanation of future risk mechanism",
      "prevention": "what can be done to reduce this risk"
    }}
  ],
  "disease_summary": "2-3 sentence overall disease risk summary for a patient",
  "recommendations": ["4-5 specific next steps with tool names like BLAST, Ensembl, ClinVar, OMIM, etc."]
}}"""


async def classify_with_gemini(sequence: str, features: dict) -> dict:
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not found in .env file")

    prompt = build_prompt(sequence, features)

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a world-class bioinformatics and clinical genomics scientist. Respond with raw JSON only. No markdown, no backticks, no explanation. Be specific and scientifically accurate."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
        "response_format": {"type": "json_object"}
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                GROQ_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
            )

        if response.status_code != 200:
            raise Exception(f"Groq API returned {response.status_code}: {response.text}")

        data = response.json()
        raw = data["choices"][0]["message"]["content"].strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)
        return result

    except json.JSONDecodeError:
        return {
            "sequence_type": "Unknown", "organism_name": "Unknown", "organism_domain": "Unknown",
            "organism_details": "Could not parse response.", "sequence_origin": "Unknown.",
            "is_promoter": False, "promoter_details": "Unknown.", "gc_interpretation": "Unknown.",
            "codon_analysis": "Unknown.", "functional_prediction": "Unknown.",
            "mutation_flags": [], "evolutionary_notes": "Unknown.", "confidence": "0%",
            "summary": raw if 'raw' in locals() else "Unparseable response.",
            "current_diseases": [], "future_disease_risks": [],
            "disease_summary": "Could not determine disease associations.",
            "recommendations": ["Try again with a different sequence"]
        }
    except httpx.ConnectError:
        raise Exception("Cannot connect to Groq API. Check your internet connection.")
    except Exception as e:
        raise Exception(f"Groq API error: {str(e)}")
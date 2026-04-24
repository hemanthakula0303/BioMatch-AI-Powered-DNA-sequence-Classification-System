from collections import Counter
import re

VALID_BASES = set("ATGC")

def validate_sequence(sequence: str) -> tuple[bool, str]:
    if not sequence:
        return False, "Sequence cannot be empty."
    if len(sequence) < 10:
        return False, "Sequence too short. Minimum 10 bases required."
    if len(sequence) > 10000:
        return False, "Sequence too long. Maximum 10,000 bases allowed."
    invalid = set(sequence) - VALID_BASES
    if invalid:
        return False, f"Invalid characters found: {', '.join(invalid)}. Only A, T, G, C allowed."
    return True, ""

def gc_content(sequence: str) -> float:
    g = sequence.count("G")
    c = sequence.count("C")
    return round((g + c) / len(sequence) * 100, 2)

def at_content(sequence: str) -> float:
    a = sequence.count("A")
    t = sequence.count("T")
    return round((a + t) / len(sequence) * 100, 2)

def base_composition(sequence: str) -> dict:
    total = len(sequence)
    counts = Counter(sequence)
    return {
        base: {"count": counts.get(base, 0), "percentage": round(counts.get(base, 0) / total * 100, 2)}
        for base in ["A", "T", "G", "C"]
    }

def kmer_frequency(sequence: str, k: int = 3) -> dict:
    kmers = {}
    for i in range(len(sequence) - k + 1):
        kmer = sequence[i:i+k]
        kmers[kmer] = kmers.get(kmer, 0) + 1
    sorted_kmers = dict(sorted(kmers.items(), key=lambda x: x[1], reverse=True)[:10])
    return sorted_kmers

def detect_repeats(sequence: str) -> list:
    repeats = []
    pattern = re.compile(r'(.{3,})\1+')
    for match in pattern.finditer(sequence):
        repeats.append({
            "repeat": match.group(1),
            "position": match.start(),
            "count": len(match.group(0)) // len(match.group(1))
        })
    return repeats[:5]

def reverse_complement(sequence: str) -> str:
    complement = {"A": "T", "T": "A", "G": "C", "C": "G"}
    return "".join(complement[base] for base in reversed(sequence))

def extract_features(sequence: str) -> dict:
    return {
        "length": len(sequence),
        "gc_content": gc_content(sequence),
        "at_content": at_content(sequence),
        "base_composition": base_composition(sequence),
        "top_kmers": kmer_frequency(sequence, k=3),
        "repeats": detect_repeats(sequence),
        "reverse_complement": reverse_complement(sequence)[:50] + "..." if len(sequence) > 50 else reverse_complement(sequence)
    }

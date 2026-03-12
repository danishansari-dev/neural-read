"""
NeuralRead Adaptive NLP Engine v3.0

Research basis:
- CHI 2024: ≤10% of words highlighted → +11% comprehension
- Nielsen F-pattern: first lines/sentences get most fixations
- PubMed: consecutive/excessive highlights hurt comprehension
"""

import re
import os
import math
import logging
import statistics
from collections import Counter

logger = logging.getLogger(__name__)

HIGHLIGHT_BUDGET_RATIO = 0.10
AVG_WORDS_PER_SENTENCE = 18

PAGE_TYPE_MULTIPLIERS = {
    "technical": 1.4,
    "research":  1.4,
    "wikipedia": 1.2,
    "news":      0.8,
    "opinion":   0.8,
    "short":     0.6,
    "default":   1.0,
}

TRANSITION_WORDS = {
    "however", "therefore", "consequently", "furthermore", "nevertheless",
    "significantly", "importantly", "notably", "critically", "essentially",
    "ultimately", "surprisingly", "remarkably", "specifically", "particularly",
    "especially", "evidence", "research", "study", "found", "discovered",
    "revealed", "concluded", "demonstrates", "indicates", "suggests", "proves"
}

STOP_WORDS = {
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "by","from","is","are","was","were","be","been","being","have","has",
    "had","do","does","did","will","would","could","should","may","might",
    "shall","can","this","that","these","those","it","its","they","them",
    "their","there","here","when","where","who","which","what","how","all",
    "each","every","both","few","more","most","other","some","such","than",
    "then","so","yet","as","if","not","no","nor","only","own","same","just",
    "also","about","over","into","after","before","between"
}


def get_openai_client():
    """Lazy OpenAI client — only created when actually needed."""
    from openai import OpenAI
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def classify_page(url: str, metadata: dict, text: str) -> str:
    url_lower = url.lower() if url else ""
    if "wikipedia.org" in url_lower:
        return "wikipedia"
    if any(x in url_lower for x in ["arxiv", "pubmed", "doi.org"]):
        return "research"
    if any(x in url_lower for x in ["docs.", "developer.", "documentation"]):
        return "technical"
    if any(x in url_lower for x in ["techcrunch","bbc","reuters","theverge",
                                     "wired","bloomberg","nytimes","news"]):
        return "news"
    total_words = metadata.get("word_count", 0) or len(text.split())
    if total_words < 250:
        return "short"
    heading_count = metadata.get("heading_count", 0)
    paragraph_count = metadata.get("paragraph_count", 1)
    if heading_count > 0 and (heading_count / max(paragraph_count,1)) > 0.3:
        return "technical"
    return "default"


def clean_text(text: str) -> str:
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\[.*?\]", "", text)
    return text.strip()


def split_into_paragraphs(text: str) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    return paras if paras else [text]


def split_sentences(text: str) -> list[str]:
    raw = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)
    return [
        s.strip() for s in raw
        if len(s.strip()) >= 40 and len(s.strip()) <= 500 and s.count(" ") >= 4
    ]


def tokenize(text: str) -> list[str]:
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    return [w for w in words if w not in STOP_WORDS]


def compute_tfidf_scores(sentences: list[str]) -> list[float]:
    n = len(sentences)
    if n == 0:
        return []
    tokenized = [tokenize(s) for s in sentences]
    doc_freq = Counter()
    for tokens in tokenized:
        for word in set(tokens):
            doc_freq[word] += 1
    scores = []
    for tokens in tokenized:
        if not tokens:
            scores.append(0.0)
            continue
        tf = Counter(tokens)
        total = sum(
            (freq / len(tokens)) * (math.log((n+1)/(doc_freq[w]+1)) + 1)
            for w, freq in tf.items()
        )
        scores.append(total / len(tf))
    return scores


def position_score(para_idx: int, sent_idx_in_para: int, total_paras: int) -> float:
    score = 0.0
    if para_idx == 0:             score += 0.40
    elif para_idx == 1:           score += 0.25
    elif para_idx == total_paras - 1: score += 0.20
    elif para_idx == total_paras - 2: score += 0.10
    elif para_idx / max(total_paras-1,1) < 0.15: score += 0.15
    elif para_idx / max(total_paras-1,1) > 0.85: score += 0.12
    if sent_idx_in_para == 0:   score += 0.20
    elif sent_idx_in_para == 1: score += 0.08
    return score


def entity_score(sentence: str) -> float:
    score = 0.0
    if re.search(r"\d+\.?\d*\s*(%|percent|billion|million|trillion|thousand)",
                 sentence, re.IGNORECASE):
        score += 0.20
    elif re.search(r"\b(19|20)\d{2}\b", sentence):
        score += 0.08
    elif re.search(r"\d+", sentence):
        score += 0.10
    if re.search(r"[\$\€\£\¥]\d+|\d+\s*(dollars|euros|pounds)",
                 sentence, re.IGNORECASE):
        score += 0.12
    proper = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b", sentence)
    score += 0.10 if len(proper) >= 2 else (0.05 if len(proper) == 1 else 0)
    if any(w in sentence.lower() for w in TRANSITION_WORDS):
        score += 0.12
    return min(score, 0.50)


def length_score(sentence: str) -> float:
    n = len(sentence)
    if 80 <= n <= 220:   return 0.10
    elif 50 <= n <= 300: return 0.04
    else:                return -0.12


def compute_page_density(sentences: list[str]) -> float:
    if not sentences:
        return 0.3
    rich = sum(
        1 for s in sentences
        if (re.search(r"\d+", s) or
            re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b", s) or
            any(w in s.lower() for w in TRANSITION_WORDS))
    )
    return rich / len(sentences)


def compute_highlight_budget(total_words: int, page_type: str,
                              page_density: float, total_sentences: int) -> int:
    word_budget = total_words * HIGHLIGHT_BUDGET_RATIO
    word_budget *= PAGE_TYPE_MULTIPLIERS.get(page_type, 1.0)
    word_budget *= (0.70 + page_density * 0.60)
    max_sents = max(1, int(word_budget / AVG_WORDS_PER_SENTENCE))
    max_sents = min(max_sents, int(total_sentences * 0.20))
    return max(1, min(max_sents, 20))


def select_by_threshold(scored: list[dict], max_count: int,
                         page_density: float) -> list[dict]:
    if not scored:
        return []
    scores = [s["raw_score"] for s in scored]
    mean_s = statistics.mean(scores)
    std_s = statistics.stdev(scores) if len(scores) > 1 else 0.1
    k = 1.0 - (page_density * 0.50)
    threshold = mean_s + k * std_s
    candidates = [s for s in scored if s["raw_score"] >= threshold]
    candidates.sort(key=lambda x: (x["para_idx"], x["sent_idx"]))
    if len(candidates) > max_count:
        candidates = sorted(candidates, key=lambda x: -x["raw_score"])[:max_count]
        candidates.sort(key=lambda x: (x["para_idx"], x["sent_idx"]))
    # Gap enforcement: no two consecutive sentences in same paragraph
    final, last_para, last_sent = [], -99, -99
    for c in candidates:
        if not (c["para_idx"] == last_para and c["sent_idx"] <= last_sent + 1):
            final.append(c)
            last_para, last_sent = c["para_idx"], c["sent_idx"]
    return final


def assign_tiers(highlights: list[dict]) -> list[dict]:
    if not highlights:
        return highlights
    scores = sorted([h["raw_score"] for h in highlights], reverse=True)
    n = len(scores)
    critical_cutoff  = scores[max(0, int(n * 0.15) - 1)]
    important_cutoff = scores[max(0, int(n * 0.50) - 1)]
    for h in highlights:
        if h["raw_score"] >= critical_cutoff:
            h["importance_tier"] = "critical"
        elif h["raw_score"] >= important_cutoff:
            h["importance_tier"] = "important"
        else:
            h["importance_tier"] = "notable"
    return highlights


def gpt_rerank(candidates: list[str], title: str,
               target_count: int) -> list[str] | None:
    if not candidates or not os.getenv("OPENAI_API_KEY"):
        return None
    try:
        client = get_openai_client()
        numbered = "\n".join([f"{i+1}. {s}" for i, s in enumerate(candidates)])
        title_ctx = f'Article: "{title}"\n\n' if title else ""
        prompt = f"""{title_ctx}Pick the {target_count} most important sentences \
for understanding this article's key insights.
Rules: return EXACTLY {target_count} sentences, verbatim, one per line, \
no numbering, no explanation.
Candidates:\n{numbered}"""
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system",
                 "content": "Return only the requested sentences, verbatim, one per line."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.1
        )
        raw = res.choices[0].message.content.strip()
        lines = [
            l.strip() for l in raw.split("\n")
            if len(l.strip()) > 30
            and not re.match(r"^\d+[\.\)]", l.strip())
            and not l.strip().lower().startswith(("here are","the following"))
        ]
        return lines[:target_count] if lines else None
    except Exception as e:
        logger.error(f"GPT rerank failed: {e}")
        return None


def extract_highlights(text: str, title: str = "", url: str = "",
                       metadata: dict = None, use_gpt: bool = True) -> list[dict]:
    """
    Adaptive highlight extraction.
    Returns 1–20 highlights depending on page type, length, and density.
    Each highlight: {sentence, score, importance_tier}
    """
    metadata = metadata or {}
    page_type = classify_page(url, metadata, text)
    logger.info(f"Page type: {page_type}")

    cleaned = clean_text(text)
    paragraphs = split_into_paragraphs(cleaned)
    total_paras = len(paragraphs)

    all_sentences = []
    for para_idx, para in enumerate(paragraphs):
        for sent_idx, sent in enumerate(split_sentences(para)):
            all_sentences.append({
                "sentence": sent,
                "para_idx": para_idx,
                "sent_idx": sent_idx,
            })

    if not all_sentences:
        return []
    if len(all_sentences) <= 2:
        return [{"sentence": s["sentence"],
                 "score": 0.90 - i*0.15,
                 "importance_tier": "critical" if i == 0 else "important"}
                for i, s in enumerate(all_sentences)]

    sentences_only = [s["sentence"] for s in all_sentences]
    page_density = compute_page_density(sentences_only)
    total_words = metadata.get("word_count") or len(cleaned.split())
    max_highlights = compute_highlight_budget(
        total_words, page_type, page_density, len(all_sentences)
    )
    logger.info(
        f"Budget: {max_highlights} highlights "
        f"({total_words}w, density={page_density:.2f}, type={page_type})"
    )

    tfidf_scores = compute_tfidf_scores(sentences_only)
    for i, item in enumerate(all_sentences):
        raw = (
            tfidf_scores[i] * 0.50 +
            position_score(item["para_idx"], item["sent_idx"], total_paras) * 0.25 +
            entity_score(item["sentence"]) * 0.15 +
            length_score(item["sentence"]) * 0.10
        )
        item["raw_score"] = round(raw, 4)

    selected = select_by_threshold(all_sentences, max_highlights, page_density)
    if not selected:
        selected = sorted(all_sentences, key=lambda x: -x["raw_score"])[:max_highlights]
        selected.sort(key=lambda x: (x["para_idx"], x["sent_idx"]))

    # GPT reranking over a wider pool
    if use_gpt and os.getenv("OPENAI_API_KEY") and len(selected) >= 2:
        pool = sorted(all_sentences, key=lambda x: -x["raw_score"])
        pool_sents = [s["sentence"] for s in pool[:min(len(pool), max_highlights*2)]]
        reranked = gpt_rerank(pool_sents, title, len(selected))
        if reranked:
            sent_map = {s["sentence"]: s for s in all_sentences}
            gpt_selected = []
            for sent in reranked:
                match = sent_map.get(sent)
                if not match:
                    for orig in all_sentences:
                        if sent[:50] in orig["sentence"]:
                            match = orig
                            break
                if match:
                    gpt_selected.append(match)
            if gpt_selected:
                selected = gpt_selected
                selected.sort(key=lambda x: (x["para_idx"], x["sent_idx"]))

    selected = assign_tiers(selected)
    score_map = {"critical": 0.90, "important": 0.75, "notable": 0.60}
    return [
        {
            "sentence": item["sentence"],
            "score": score_map.get(item.get("importance_tier","important"), 0.75),
            "importance_tier": item.get("importance_tier", "important")
        }
        for item in selected
    ]

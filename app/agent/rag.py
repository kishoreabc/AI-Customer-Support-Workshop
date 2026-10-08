import re
import math
from typing import List, Dict, Any
from app.data.database import query_all

def tokenize(text: str) -> List[str]:
    return [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_]+\b', text) if len(w) > 1]

def search_knowledge_base(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    docs = query_all("SELECT doc_id, title, category, content, tags FROM knowledge_documents")
    if not docs:
        return []

    q_tokens = set(tokenize(query))
    if not q_tokens:
        return docs[:top_k]

    scored = []
    for doc in docs:
        doc_text = f"{doc['title']} {doc['category']} {doc['content']} {doc.get('tags', '')}"
        doc_tokens = tokenize(doc_text)
        
        # Calculate term overlap and TF score
        matches = sum(1 for t in q_tokens if t in doc_tokens)
        if matches > 0:
            score = (matches / len(q_tokens)) * 0.7 + (len(doc_tokens) / (len(doc_tokens) + 10)) * 0.3
            scored.append((score, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            "docId": item[1]["doc_id"],
            "title": item[1]["title"],
            "category": item[1]["category"],
            "content": item[1]["content"],
            "relevanceScore": round(item[0], 3),
        }
        for item in scored[:top_k]
    ]

def search_faqs(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    faqs = query_all("SELECT faq_id, question, answer, category, tags FROM faqs WHERE status = 'PUBLISHED'")
    if not faqs:
        return []

    q_tokens = set(tokenize(query))
    if not q_tokens:
        return faqs[:top_k]

    scored = []
    for f in faqs:
        faq_text = f"{f['question']} {f['answer']} {f['category']} {f.get('tags', '')}"
        faq_tokens = tokenize(faq_text)
        matches = sum(1 for t in q_tokens if t in faq_tokens)
        if matches > 0:
            score = (matches / len(q_tokens)) * 0.8 + 0.2
            scored.append((score, f))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            "faqId": item[1]["faq_id"],
            "question": item[1]["question"],
            "answer": item[1]["answer"],
            "category": item[1]["category"],
            "relevanceScore": round(item[0], 3),
        }
        for item in scored[:top_k]
    ]

import re
from typing import List, Dict, Any
from app.data.knowledge_base import TELECOM_KNOWLEDGE_DOCS

class RAGService:
    def __init__(self):
        self.docs = TELECOM_KNOWLEDGE_DOCS

    def search(self, query: str, category_filter: str = None, top_k: int = 2) -> List[Dict[str, Any]]:
        """
        Retrieves top relevant telecom knowledge base documents based on query intent & keywords.
        """
        query_tokens = set(re.findall(r'\w+', query.lower()))
        scored_docs = []

        for doc in self.docs:
            score = 0.0
            doc_text = f"{doc['title']} {doc['content']} {' '.join(doc.get('tags', []))}".lower()
            doc_tokens = set(re.findall(r'\w+', doc_text))
            
            # Category boost
            if category_filter and category_filter.lower() in doc.get("category", "").lower():
                score += 3.0
            
            # Tag match boosts
            for tag in doc.get("tags", []):
                if tag.lower() in query_tokens:
                    score += 2.5
                elif any(q in tag.lower() for q in query_tokens if len(q) > 3):
                    score += 1.0

            # Title match boosts
            title_tokens = set(re.findall(r'\w+', doc["title"].lower()))
            overlap_title = query_tokens.intersection(title_tokens)
            score += len(overlap_title) * 2.0

            # Content match
            overlap_body = query_tokens.intersection(doc_tokens)
            score += len(overlap_body) * 0.2

            if score > 0:
                scored_docs.append({
                    "id": doc["id"],
                    "title": doc["title"],
                    "category": doc["category"],
                    "content": doc["content"].strip(),
                    "score": round(score, 2)
                })

        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:top_k]

rag_service = RAGService()

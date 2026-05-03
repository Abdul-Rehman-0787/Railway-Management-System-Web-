import chromadb
from chromadb.utils import embedding_functions
import json
import os


class ChromaStore:
    def __init__(self, persist_dir="./chroma_db"):
        self.client = chromadb.PersistentClient(path=persist_dir)

        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )

        # Delete existing collection for a fresh start on each launch
        try:
            self.client.delete_collection("railway_knowledge")
        except Exception:
            pass

        self.collection = self.client.create_collection(
            name="railway_knowledge",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

        self.init_knowledge_base()

    def init_knowledge_base(self):
        """Load knowledge base from JSON file."""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        kb_path = os.path.join(current_dir, "knowledge_base.json")

        try:
            with open(kb_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            print("⚠️  knowledge_base.json not found — starting with empty knowledge base.")
            return

        documents = []
        metadatas = []
        ids = []

        for idx, item in enumerate(data.get("knowledge_base", [])):
            # Combine question + answer so both are searchable
            doc_text = (
                f"Question: {item['question']}\n"
                f"Answer: {item['answer']}\n"
                f"Category: {item['category']}"
            )
            documents.append(doc_text)
            metadatas.append({
                "category": item["category"],
                "question": item["question"]
            })
            ids.append(f"kb_{idx}")

        if documents:
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            print(f"✅ Loaded {len(documents)} knowledge items into ChromaDB")

    def search(self, query: str, n_results: int = 3) -> list:
        """Return top-n relevant knowledge snippets for a query."""
        try:
            total = self.get_count()
            if total == 0:
                return []
            results = self.collection.query(
                query_texts=[query],
                n_results=min(n_results, total)
            )
            if results and results["documents"]:
                return results["documents"][0]
            return []
        except Exception as e:
            print(f"ChromaDB search error: {e}")
            return []

    def add_knowledge(self, question: str, answer: str, category: str) -> str:
        """Add a new Q&A pair to the knowledge base."""
        doc_text = (
            f"Question: {question}\n"
            f"Answer: {answer}\n"
            f"Category: {category}"
        )
        existing = self.collection.get()
        doc_id = f"custom_{len(existing['ids'])}"
        self.collection.add(
            documents=[doc_text],
            metadatas=[{"category": category, "question": question}],
            ids=[doc_id]
        )
        return doc_id

    def get_count(self) -> int:
        """Return number of documents in the collection."""
        try:
            return self.collection.count()
        except Exception:
            return 0
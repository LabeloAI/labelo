

class MiniLM_L6V2:
    def search(self, key, tasks):
        try:
            from sentence_transformers import SentenceTransformer, util
            import torch
        except ImportError:
            return []
        k = min(30, len(tasks))
        embeddings = []
        task_ids = []
        sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
        query_embedding = sbert_model.encode(key, convert_to_tensor=True)
        query_embedding = query_embedding.unsqueeze(0)
        for task in tasks:
            file = task.file_upload
            if file.format not in [".jpg", ".png", ".jpeg"] and not file.image_description:
                continue
            embedding = sbert_model.encode(file.image_description, convert_to_tensor=True)
            embeddings.append(embedding)
            task_ids.append(task)
        if not embeddings:
            return []
        all_embeddings = torch.stack(embeddings)
        cos_scores = util.pytorch_cos_sim(query_embedding, all_embeddings)[0]
        top_results = torch.topk(cos_scores, k=k)
        results = []
        for score, idx in zip(top_results[0], top_results[1]):
            task = task_ids[idx]
            if score.item() > .3:
                results.append(task)
        return results


class WordSearch:
    def search(self, key: str, tasks):
        result = []
        for task in tasks:
            file = task.file_upload
            if file.format not in [".jpg", ".png", ".jpeg"] and not file.image_description:
                continue
            if key.lower() in file.image_description.lower():
                result.append(task)
        return result


SEARCH = {
    "minilm": {
        "name": "all-MiniLM-L6-v2",
        "model": MiniLM_L6V2,
    },
    "word": {
        "name": "Word Search",
        "model": WordSearch
    }
}

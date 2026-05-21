export interface SearchResult {
  id: string
  content: string
  metadata?: Record<string, any>
  distance?: number
}

export interface VectorStore {
  addDocuments(
    contents: string[],
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; count: number }>
  similaritySearch(query: string, limit?: number): Promise<SearchResult[]>
}

'use client'

import React from 'react'
import algoliasearch from 'algoliasearch/lite'
import { InstantSearch, SearchBox, Hits } from 'react-instantsearch'
import type { Hit as AlgoliaHit, SearchClient } from 'instantsearch.js'

// SearchProps の型定義
type SearchProps = {
  initialQuery: string
}

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY as string
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME as string

const algoliaClient = algoliasearch(appId, apiKey)

// 型互換性を確保したカスタムクライアント
const searchClient: SearchClient = {
  ...algoliaClient,
  search: algoliaClient.search,
  searchForFacetValues: async (
    requests: Array<{
      indexName: string
      params: {
        facetName: string
        facetQuery: string
        maxFacetHits?: number
      }
    }>
  ) => {
    const results = await algoliaClient.searchForFacetValues(
      requests.map(
        ({
          indexName,
          params,
        }: {
          indexName: string
          params: {
            facetName: string
            facetQuery: string
            maxFacetHits?: number
          }
        }) => ({
          indexName,
          params: {
            facetName: params.facetName,
            facetQuery: params.facetQuery,
            maxFacetHits: params.maxFacetHits,
          },
        })
      )
    )
    return results as any
  },
} as unknown as SearchClient

export default function Search({ initialQuery }: SearchProps) {
  return (
    <InstantSearch
      indexName={indexName}
      searchClient={searchClient}
      initialUiState={{ [indexName]: { query: initialQuery } }}
    >
      {/* 既存の実装 */}
      <SearchBox />
      <Hits />
    </InstantSearch>
  )
}
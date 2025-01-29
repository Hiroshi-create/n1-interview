'use client'

import React from 'react'
import algoliasearch from 'algoliasearch/lite'
import { InstantSearch, SearchBox, Hits } from 'react-instantsearch-dom'
import { Hit as AlgoliaHit } from 'instantsearch.js'
import { Theme } from '@/stores/Theme'

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY as string
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME as string

const searchClient = algoliasearch(appId, apiKey)

interface HitProps {
    hit: AlgoliaHit<Theme>;
}

interface SearchProps {
    initialQuery: string;
}

export default function Search({ initialQuery }: SearchProps) {
  return (
    <InstantSearch searchClient={searchClient} indexName={indexName}>
      <SearchBox defaultRefinement={initialQuery} />
      <Hits hitComponent={Hit} />
    </InstantSearch>
  )
}

function Hit({ hit }: HitProps) {
  return (
    <div>
      <div className="hit-name">
        <h3>{hit.theme}</h3>
      </div>
      <div className="hit-details">
        <p>Theme ID: {hit.themeId}</p>
        <p>Created by: {hit.createUserId}</p>
        <p>Client ID: {hit.clientId}</p>
        {/* 他のフィールドも同様に表示可能 */}
      </div>
    </div>
  )
}























// 'use client'

// import React from 'react'
// import algoliasearch from 'algoliasearch/lite'
// import { InstantSearch, SearchBox, Hits } from 'react-instantsearch-dom'
// import { Hit as AlgoliaHit } from 'instantsearch.js'
// import { Theme } from '@/stores/Theme'

// const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string
// const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY as string
// const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME as string

// const searchClient = algoliasearch(appId, apiKey)

// interface HitProps {
//     hit: AlgoliaHit<Theme>;
// }

// export default function Search() {
//   return (
//     <InstantSearch searchClient={searchClient} indexName={indexName}>
//       <SearchBox />
//       <Hits hitComponent={Hit} />
//     </InstantSearch>
//   )
// }

// function Hit({ hit }: HitProps) {
//   return (
//     <div>
//       <div className="hit-name">
//         <h3>{hit.theme}</h3>
//       </div>
//       <div className="hit-details">
//         <p>Theme ID: {hit.themeId}</p>
//         <p>Created by: {hit.createUserId}</p>
//         <p>Client ID: {hit.clientId}</p>
//         {/* 他のフィールドも同様に表示可能 */}
//       </div>
//     </div>
//   )
// }

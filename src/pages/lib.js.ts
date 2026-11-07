import type { APIRoute } from 'astro'
// @ts-ignore
import retinaCode from 'virtual:re-tina-code'

export const prerender = true

export const GET = (async ({ params }) => {
  return new Response(retinaCode, {
    headers: {
      'Content-Type': 'application/javascript',
    },
  })
}) satisfies APIRoute

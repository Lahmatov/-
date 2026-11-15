import type { APIClient } from "../../api/client";
import type { Genre, Recommendation, TopBooks } from "../../api/models";

export type DiscoverData = { recommendations: Recommendation[]; top: TopBooks | null; genres: Genre[] };

/** Обзор — дополнение к поиску: если что-то не загрузилось, просто не показываем секцию. */
export async function loadDiscover(api: APIClient): Promise<DiscoverData> {
  const [recommendations, top, genres] = await Promise.all([
    api.recommendations().catch(() => [] as Recommendation[]),
    api.top().catch(() => null),
    api.genres().catch(() => [] as Genre[]),
  ]);
  return { recommendations, top, genres: genres.filter((g) => g.count > 0) };
}

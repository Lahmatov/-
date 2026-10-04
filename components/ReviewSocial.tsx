import Link from "next/link";
import { deleteCommentAction, toggleLike } from "@/lib/actions";
import { timeAgo } from "@/lib/time";
import { CommentForm } from "./CommentForm";
import { SubmitButton } from "./SubmitButton";
import { ReportButton } from "./ReportButton";

type Comment = { id: string; text: string; createdAt: Date; user: { id: string; name: string | null } };

/** Лайк и комментарии под отзывом. `path` — страница, которую нужно обновить после действия. */
export function ReviewSocial(props: {
  entryId: string;
  reviewAuthorId: string;
  path: string;
  viewerId: string | null;
  likes: number;
  likedByMe: boolean;
  comments: Comment[] | number;
}) {
  const { entryId, path, viewerId, likes, likedByMe } = props;
  const commentCount = Array.isArray(props.comments) ? props.comments.length : props.comments;
  const likeButton = (
    <span className={likedByMe ? "text-red-400" : "text-neutral-400"}>
      {likedByMe ? "♥" : "♡"} {likes > 0 ? likes : ""}
    </span>
  );
  return (
    <div className="mt-2 space-y-2 text-sm">
      <div className="flex items-center gap-4">
        {viewerId ? (
          <form action={toggleLike.bind(null, entryId, !likedByMe, path)}>
            <SubmitButton className="btn px-0 py-0 hover:opacity-80">
              <span aria-label={likedByMe ? "Убрать лайк" : "Нравится"}>{likeButton}</span>
            </SubmitButton>
          </form>
        ) : (
          likeButton
        )}
        {!Array.isArray(props.comments) && (
          <Link href={`${path}#review-${entryId}`} className="text-neutral-400 hover:text-neutral-200">
            💬 {commentCount > 0 ? commentCount : ""}
          </Link>
        )}
      </div>
      {Array.isArray(props.comments) && (
        <details open={commentCount > 0 && commentCount <= 3}>
          <summary className="cursor-pointer text-neutral-400">
            Комментарии{commentCount > 0 ? ` (${commentCount})` : ""}
          </summary>
          <div className="mt-2 space-y-2 border-l border-neutral-800 pl-3">
            {props.comments.map((c) => (
              <div key={c.id}>
                <div className="flex items-baseline gap-2 text-xs">
                  <Link href={`/u/${c.user.id}`} className="font-semibold hover:underline">
                    {c.user.name ?? "Читатель"}
                  </Link>
                  <span className="text-neutral-500">{timeAgo(c.createdAt)}</span>
                  {viewerId && (viewerId === c.user.id || viewerId === props.reviewAuthorId) && (
                    <form action={deleteCommentAction.bind(null, c.id, path)} className="ml-auto">
                      <button className="text-neutral-600 hover:text-red-400">удалить</button>
                    </form>
                  )}
                  {viewerId && viewerId !== c.user.id && (
                    <span className={viewerId === props.reviewAuthorId ? "" : "ml-auto"}>
                      <ReportButton commentId={c.id} />
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-line text-neutral-300">{c.text}</p>
              </div>
            ))}
            {viewerId && <CommentForm entryId={entryId} path={path} />}
          </div>
        </details>
      )}
    </div>
  );
}

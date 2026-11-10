import { followUser, unfollowUser } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

export function FollowButton({ userId, isFollowing }: { userId: string; isFollowing: boolean }) {
  return isFollowing ? (
    <form action={unfollowUser.bind(null, userId)}>
      <SubmitButton className="btn-ghost">Вы подписаны</SubmitButton>
    </form>
  ) : (
    <form action={followUser.bind(null, userId)}>
      <SubmitButton>Подписаться</SubmitButton>
    </form>
  );
}

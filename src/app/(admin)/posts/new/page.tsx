import { PageHeader } from '@/shared/ui';
import { PostEditor } from '@/features/posts/components/PostEditor';

export const dynamic = 'force-dynamic';

export default function NewPostPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'SNS 게시물', href: '/posts' }, { label: '새 게시물 작성' }]}
        title="새 게시물 작성"
        description="초안으로 저장하거나 예약해 두고, 준비되면 LinkedIn 에 바로 발행합니다."
      />
      <PostEditor />
    </>
  );
}

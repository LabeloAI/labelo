import { FC } from 'react';
import { observer } from 'mobx-react';
import { Block } from '../../utils/bem';
import { CommentItem } from './CommentItem';

export const CommentsList: FC<{ commentStore: any, annotationStore: any }> = observer(({ commentStore, annotationStore }) => {

  return (
    <Block name="comments-list">
      {commentStore.comments.map((comment: any) => (
        <CommentItem key={comment.id} comment={comment} listComments={commentStore.listComments}
          setCommentId={commentStore.setCurrentCommentId}
          updateRejectCommentResolve={annotationStore.selected?.updateRejectCommentResolve}/>
      ))}
    </Block>
  );
});

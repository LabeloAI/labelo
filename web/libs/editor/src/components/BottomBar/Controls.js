import { inject, observer } from 'mobx-react';
import { Button } from '../../common/Button/Button';
import { Tooltip } from '../../common/Tooltip/Tooltip';
import { Block, Elem } from '../../utils/bem';
import { isDefined } from '../../utils/utilities';
import { IconBan } from '../../assets/icons';
import { FF_PROD_E_111, isFF } from '../../utils/feature-flags';
import './Controls.styl';
import { useCallback, useMemo, useState } from 'react';
import { LsChevron } from '../../assets/icons';
import { Dropdown } from '../../common/Dropdown/DropdownComponent';

const TOOLTIP_DELAY = 0.8;

const ButtonTooltip = inject('store')(observer(({ store, title, children }) => {
  return (
    <Tooltip
      title={title}
      enabled={store.settings.enableTooltips}
      mouseEnterDelay={TOOLTIP_DELAY}
    >
      {children}
    </Tooltip>
  );
}));

const controlsInjector = inject(({ store }) => {
  return {
    store,
    history: store?.annotationStore?.selected?.history,
  };
});

export const Controls = controlsInjector(observer(({ store, history, annotation }) => {
  const isReview = store.hasInterface('review');
  const isNotQuickView = store.hasInterface('topbar:prevnext');
  const historySelected = isDefined(store.annotationStore.selectedHistory);
  const { userGenerate, sentUserGenerate, versions, results, editable: annotationEditable } = annotation;
  const buttons = [];
  const currentUser = window.APP_SETTINGS.user;
  let allReviewers = store.reviewers.map( re => re.id)
  const isReviewer = allReviewers.includes(currentUser.id)

  const [isInProgress, setIsInProgress] = useState(false);

  const disabled = !annotationEditable || store.isSubmitting || historySelected || isInProgress;
  const submitDisabled = store.hasInterface('annotations:deny-empty') && results.length === 0;

  const buttonHandler = useCallback(async (e, callback, tooltipMessage) => {
    const { addedCommentThisSession, currentCommentId, commentFormSubmit } = store.commentStore;

    if (isInProgress) return;
    setIsInProgress(true);

    const selected = store.annotationStore?.selected;

    if (addedCommentThisSession) {
      selected?.submissionInProgress();
      callback();
    } else if (currentCommentId) {
      e.preventDefault();
      selected?.submissionInProgress();
      await commentFormSubmit();
      callback();
    } else {
      store.commentStore.setTooltipMessage(tooltipMessage);
    }
    setIsInProgress(false);
  }, [
    store.rejectAnnotation,
    store.skipTask,
    store.commentStore.currentCommentId,
    store.commentStore.commentFormSubmit,
    store.commentStore.addedCommentThisSession,
    isInProgress,
  ]);

  const RejectButton = useMemo(() => {
    return (
      <ButtonTooltip key="reject" title="Reject annotation: [ Ctrl+Space ]">
        <Button aria-label="reject-annotation" disabled={disabled} onClick={async (e) => {

            const selected = store.annotationStore?.selected;
            const comment = {id: store.commentStore.currentCommentId};
            selected?.submissionInProgress();
            buttonHandler(e, () => store.rejectAnnotation({comment}), 'Please enter a comment before rejecting');
        }}>
          Reject
        </Button>
      </ButtonTooltip>
    );
  }, [disabled, store]);
  const reviewCondition = isReview && store.annotationStore?.selected?.pk && isReviewer
  if ((reviewCondition && !store.annotationStore?.selected?.review_status) || (
      reviewCondition && store.annotationStore?.selected?.review_status === "Reject" &&
      store.annotationStore?.selected?.reject_comment_resolved
  )) {
    buttons.push(RejectButton);

    buttons.push(
      <ButtonTooltip key="accept" title="Accept annotation: [ Ctrl+Enter ]">
        <Button aria-label="accept-annotation" disabled={disabled} look="primary" onClick={async () => {
          const selected = store.annotationStore?.selected;

          selected?.submissionInProgress();
          await store.commentStore.commentFormSubmit();
          let mode = history.canUndo ? 'Fix' : 'Accept'
          store.acceptAnnotation(mode);
        }}>
          {history.canUndo ? 'Fix + Accept' : 'Accept'}
        </Button>
      </ButtonTooltip>,
    );
  }else if(reviewCondition && store.annotationStore?.selected?.review_status === "Reject"
    && !store.annotationStore?.selected?.reject_comment_resolved){
    buttons.push(<Elem name="review-info" key="reviewed">
        Waiting for resolving the issue.
      </Elem>)
  }
  else if(isReviewer && store.annotationStore?.selected?.review_status){
    buttons.push(<Elem name="review-info" key="reviewed">
        Is already reviewed
      </Elem>)
  } else if (isReviewer){
    buttons.push(<Elem name="review-info" key="not-submitted">
        Annotation is not yet submitted
      </Elem>)
  }
  else if (annotation.skipped) {
    buttons.push(
      <Elem name="skipped-info" key="skipped">
        <IconBan color="#d00" /> Was skipped
      </Elem>);
    buttons.push(
      <ButtonTooltip key="cancel-skip" title="Cancel skip: []">
        <Button aria-label="cancel-skip" disabled={disabled} look="primary" onClick={async () => {
          const selected = store.annotationStore?.selected;

          selected?.submissionInProgress();
          await store.commentStore.commentFormSubmit();
          store.unskipTask();
        }}>
          Cancel skip
        </Button>
      </ButtonTooltip>,
    );
  } else {
    if (store.hasInterface('skip')) {
      buttons.push(
        <ButtonTooltip key="skip" title="Cancel (skip) task: [ Ctrl+Space ]">
          <Button aria-label="skip-task" disabled={disabled} onClick={async (e) => {
            if (store.hasInterface('comments:skip') ?? true) {
              buttonHandler(e, () => store.skipTask({}), 'Please enter a comment before skipping');
            } else {
              const selected = store.annotationStore?.selected;

              selected?.submissionInProgress();
              await store.commentStore.commentFormSubmit();
              store.skipTask({});
            }
          }}>
            Skip
          </Button>
        </ButtonTooltip>,
      );
    }

    const look = (disabled || submitDisabled) ? 'disabled' : 'primary';

    if (isFF(FF_PROD_E_111)) {
      const isDisabled = disabled || submitDisabled;
      const useExitOption = !isDisabled && isNotQuickView;

      const SubmitOption = ({ isUpdate, onClickMethod }) => {
        return (
          <Button
            name="submit-option"
            look="secondary"
            onClick={async (event) => {
              event.preventDefault();

              const selected = store.annotationStore?.selected;

              selected?.submissionInProgress();

              if ('URLSearchParams' in window) {
                const searchParams = new URLSearchParams(window.location.search);

                searchParams.set('exitStream', 'true');
                const newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();

                window.history.pushState(null, '', newRelativePathQuery);
              }

              await store.commentStore.commentFormSubmit();
              onClickMethod();
            }}
          >
            {`${isUpdate ? 'Update' : 'Submit'} and exit`}
          </Button>
        );
      };

      if ((userGenerate) || (store.explore && !userGenerate && store.hasInterface('submit')) && !isReviewer) {
        const title = submitDisabled
          ? 'Empty annotations denied in this project'
          : 'Save results: [ Ctrl+Enter ]';

        buttons.push(
          <ButtonTooltip key="submit" title={title}>
            <Elem name="tooltip-wrapper">
              <Button
                aria-label="submit"
                name="submit"
                disabled={isDisabled}
                look={look}
                mod={{ has_icon: useExitOption, disabled: isDisabled }}
                onClick={async (event) => {
                  if (event.target.classList.contains('lsf-dropdown__trigger')) return;
                  const selected = store.annotationStore?.selected;

                  selected?.submissionInProgress();
                  await store.commentStore.commentFormSubmit();
                  store.submitAnnotation();
                }}
                icon={useExitOption && (
                  <Dropdown.Trigger
                    alignment="top-right"
                    content={<SubmitOption onClickMethod={store.submitAnnotation} isUpdate={false} />}
                  >
                    <div>
                      <LsChevron />
                    </div>
                  </Dropdown.Trigger>
                )}
              >
              Submit
              </Button>
            </Elem>
          </ButtonTooltip>,
        );
      }

      if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface('update')) && !isReviewer) {
        const isUpdate = sentUserGenerate || versions.result;
        const reviewAccepted = store.annotationStore?.selected?.review_status === "Accept"; 

        const button = (
          <ButtonTooltip key="update" title={reviewAccepted ? "The task is accepted, you don't have access to edit the annotation anymore" : "Update this task: [ Alt+Enter ]"}>
            <Button
              aria-label="submit"
              name="submit"
              disabled={disabled || submitDisabled ||reviewAccepted}
              look={look}
              mod={{ has_icon: useExitOption, disabled: isDisabled || submitDisabled || reviewAccepted }}
              onClick={async (event) => {
                if (event.target.classList.contains('lsf-dropdown__trigger')) return;
                const selected = store.annotationStore?.selected;
                selected?.submissionInProgress();
                await store.commentStore.commentFormSubmit();
                store.updateAnnotation();
              }}
              icon={useExitOption && (
                <Dropdown.Trigger
                  alignment="top-right"
                  content={<SubmitOption onClickMethod={store.updateAnnotation} isUpdate={isUpdate} />}
                >
                  <div>
                    <LsChevron />
                  </div>
                </Dropdown.Trigger>
              )}
            >
              {isUpdate ? 'Update' : 'Submit'}
            </Button>
          </ButtonTooltip>
        );

        buttons.push(button);
      }
    } else {
      if ((userGenerate) || (store.explore && !userGenerate && store.hasInterface('submit')) && !isReviewer) {
        const title = submitDisabled
          ? 'Empty annotations denied in this project'
          : 'Save results: [ Ctrl+Enter ]';

        buttons.push(
          <ButtonTooltip key="submit" title={title}>
            <Elem name="tooltip-wrapper">
              <Button aria-label="submit" disabled={disabled || submitDisabled} look={look} onClick={async () => {
                const selected = store.annotationStore?.selected;

                selected?.submissionInProgress();
                await store.commentStore.commentFormSubmit();
                store.submitAnnotation();
              }}>
                Submit
              </Button>
            </Elem>
          </ButtonTooltip>,
        );
      }

      if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface('update')) && !isReviewer) {
        const isUpdate = sentUserGenerate || versions.result;
        const button = (
          <ButtonTooltip key="update" title="Update this task: [ Alt+Enter ]">
            <Button aria-label="submit" disabled={disabled || submitDisabled} look={look} onClick={async () => {
              const selected = store.annotationStore?.selected;

              selected?.submissionInProgress();
              await store.commentStore.commentFormSubmit();
              store.updateAnnotation();
            }}>
              {isUpdate ? 'Update' : 'Submit'}
            </Button>
          </ButtonTooltip>
        );

        buttons.push(button);
      }
    }
  }

  return (
    <Block name="controls">
      {buttons}
    </Block>
  );
}));

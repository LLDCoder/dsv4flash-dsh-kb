import { useCallback, useEffect, useRef, useState } from "react";
import HomeAction from "./components/HomeAction";
import HomeInitialization from "./components/HomeInitialization";
import { useUserStore } from "@/store/user";
import { useActionStore } from '@/store/pengdingAction';
import LoginAs from "./components/LoginAs";
import { getUserAllApproveProfiles } from "@/services/userProfile";
import ProcessModal from "./components/ProcessModal";
import { myPendingAcctions } from "@/services/homePage";
import "./index.less";

interface PendingActionsPayload {
    draftList?: unknown[];
    rejectedList?: unknown[];
    pendingPaymentList?: unknown[];
    pendingModificationList?: unknown[];
    pendingDispositionList?: unknown[];
    pendingFinesList?: unknown[];
    renewalCount?: number;
}

const getSafeList = (value: unknown): unknown[] =>
    Array.isArray(value) ? value : [];

export default function Home() {
    const { userInfo, currentProfileId, identityVersion } = useUserStore();
    const pendingActionsRequestRef = useRef(0);
    const identityRefreshKey = `${currentProfileId || userInfo?.currentUserProfileId || ""}:${identityVersion}`;
    /** Avoid re-opening ProcessModal when `userInfo` is replaced but first-login flags are unchanged (e.g. IdentitysPopover `refreshApprovedProfiles`). */
    const userStableId =
        typeof userInfo?.userId === "string" && userInfo.userId.trim()
            ? userInfo.userId.trim()
            : typeof userInfo?.id === "string" && userInfo.id.trim()
              ? userInfo.id.trim()
              : typeof userInfo?.userID === "string" && userInfo.userID.trim()
                ? userInfo.userID.trim()
                : "";

    useEffect(() => {
        if (userInfo?.userId) {
            getUserAllApproveProfiles(userInfo?.userId).then((res) => {
                console.log(res);
            })
        }
    }, [userInfo?.userId]);
    
    const [showProcessModal, setShowProcessModal] = useState(false);
    const setPendingActions = useActionStore((state) => state.setActions);
    const setActionsNum = useActionStore((state) => state.setData);

    const myPengdingActionHanld = useCallback(() => {
        const requestId = pendingActionsRequestRef.current + 1;
        pendingActionsRequestRef.current = requestId;
        myPendingAcctions().then((pengdingData) => {
            if (requestId !== pendingActionsRequestRef.current) {
                return;
            }
            const data = (pengdingData.data || {}) as PendingActionsPayload;
            const draftList = getSafeList(data.draftList);
            const rejectedList = getSafeList(data.rejectedList);
            const pendingPaymentList = getSafeList(data.pendingPaymentList);
            const pendingModificationList = getSafeList(data.pendingModificationList);
            const pendingDispositionList = getSafeList(data.pendingDispositionList);
            const pendingFinesList = getSafeList(data.pendingFinesList);
            const renewalCount = data.renewalCount ?? 0;
            const nextPendingActions: PendingActionsPayload = {
                draftList,
                rejectedList,
                pendingPaymentList,
                pendingModificationList,
                pendingDispositionList,
                pendingFinesList,
                renewalCount,
            };

            setPendingActions(nextPendingActions);
            setActionsNum(
                draftList.length +
                pendingModificationList.length +
                pendingPaymentList.length +
                pendingDispositionList.length +
                pendingFinesList.length +
                renewalCount,
            );
        }).catch(() => {
            if (requestId !== pendingActionsRequestRef.current) {
                return;
            }
            setPendingActions([]);
            setActionsNum(0);
        })
    }, [setActionsNum, setPendingActions]);

    useEffect(() => {
        if (
            userStableId &&
            userInfo?.isGuidePageVisible &&
            userInfo?.isFirstLogin
        ) {
            setShowProcessModal(true);
        }
    }, [
        userStableId,
        userInfo?.isFirstLogin,
        userInfo?.isGuidePageVisible
    ]);

    useEffect(() => {
        myPengdingActionHanld();
    }, [identityRefreshKey, myPengdingActionHanld]);

    return (
        <div className="home-container">
            {
                userInfo?.isFirstLogin ?
                    <HomeInitialization /> :
                    <HomeAction
                        key={identityRefreshKey}
                        refreshAction={myPengdingActionHanld}
                    />
            }

            {
                <ProcessModal
                    show={showProcessModal}
                    close={() => setShowProcessModal(false)}
                />
            }

            {
                !!userInfo &&
                !userInfo.isFirstLogin ? (
                    <LoginAs />
                ) : null
            }
        </div>
    )
}

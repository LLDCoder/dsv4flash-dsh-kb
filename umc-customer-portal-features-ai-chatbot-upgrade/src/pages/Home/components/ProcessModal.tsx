import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'antd';
import { CustomButton } from "@/components/common";
import { Checkbox } from 'antd';
import { useHistory } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import StepSuccess from "@/assets/images/stepSuccess.svg";
import FilmIcon from "@/assets/images/filmIcon.svg";
import PhotographyIcon from "@/assets/images/photogarphyIcon.svg";
import GameItem from "@/assets/images/gameItem.svg";
import BusinessItem from "@/assets/images/businessItem.svg";
import BroadItem from "@/assets/images/broadItem.svg";
import FilmItem from "@/assets/images/filmItem.svg";
import PhotographyItem from "@/assets/images/photoghyItem.svg";
import DigitalItem from "@/assets/images/digitalItem.svg";
import OfficeItem from "@/assets/images/officeItem.svg";
import SimpleBar from "@/components/SimpleBar";
import { getUpdateGuidePageVisible } from "@/services/userProfile";
import { useUserStore } from "@/store/user";

const PROCESS_SERVICE_KEYS = [
  'broadcasting',
  'publishing',
  'filmProduction',
  'digitalMedia',
  'journalism',
  'photography',
  'gaming',
  'mediaOffice',
] as const;

const SERVICE_ICONS: Record<(typeof PROCESS_SERVICE_KEYS)[number], string> = {
  broadcasting: BroadItem,
  publishing: BusinessItem,
  filmProduction: FilmItem,
  digitalMedia: GameItem,
  journalism: DigitalItem,
  photography: PhotographyItem,
  gaming: GameItem,
  mediaOffice: OfficeItem,
};

interface ProcessModalProps {
    show: boolean;
    close: () => void;
}
interface ServiceItem {
    icon?: string;
    title: string;
    desc?: string;
    check: boolean;
}
interface SpecificItem {
    title: string;
    icon: string;
    list: ServiceItem[];
}
interface EntryItem {
    title: string;
    list: { name: string }[];
}

const ProcessModal: React.FC<ProcessModalProps> = ({ show, close }) => {
    const { t, i18n } = useTranslation();
    const [activeStep, setActiveStep] = useState(1);
    const history = useHistory();
    const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
    const [specificList, setSpecificList] = useState<SpecificItem[]>([]);
    const [entryList, setEntryList] = useState<EntryItem[]>([]);
    const userInfo = useUserStore((state) => state.userInfo);
    const setUserData = useUserStore((state) => state.setData);

    const stepList = useMemo(
        () => [
            { title: t('processModal.steps.whatYouDo'), step: 1 },
            { title: t('processModal.steps.whatYouNeed'), step: 2 },
            { title: t('processModal.steps.applicationPath'), step: 3 },
        ],
        [t],
    );

    const buildServices = useCallback((): ServiceItem[] => {
        return PROCESS_SERVICE_KEYS.map((key) => ({
            icon: SERVICE_ICONS[key],
            title: t(`processModal.services.${key}.title`),
            desc: t(`processModal.services.${key}.desc`),
            check: false,
        }));
    }, [t]);

    const buildSpecific = useCallback((): SpecificItem[] => {
        const film = 'processModal.specific.filmCategory';
        const photo = 'processModal.specific.photoCategory';
        return [
            {
                title: t(`${film}.title`),
                icon: FilmIcon,
                list: [
                    {
                        title: t(`${film}.items.filmScreeningBundle.title`),
                        desc: t(`${film}.items.filmScreeningBundle.desc`),
                        check: false,
                    },
                    {
                        title: t(`${film}.items.tempCinema.title`),
                        desc: t(`${film}.items.tempCinema.desc`),
                        check: false,
                    },
                    {
                        title: t(`${film}.items.localProduction.title`),
                        check: false,
                    },
                    {
                        title: t(`${film}.items.oneDayEvent.title`),
                        check: false,
                    },
                ],
            },
            {
                title: t(`${photo}.title`),
                icon: PhotographyIcon,
                list: [
                    {
                        title: t(`${photo}.items.groundPermit.title`),
                        desc: t(`${photo}.items.groundPermit.desc`),
                        icon: '',
                        check: false,
                    },
                    {
                        title: t(`${photo}.items.aerialPermit.title`),
                        icon: '',
                        check: false,
                    },
                    {
                        title: t(`${photo}.items.marinePermit.title`),
                        icon: '',
                        check: false,
                    },
                ],
            },
        ];
    }, [t]);

    const buildEntries = useCallback((): EntryItem[] => {
        return [
            {
                title: t('processModal.entry.filmBundleHeadline'),
                list: [
                    { name: t('processModal.prerequisiteItems.mediaActivityLicense') },
                    { name: t('processModal.entry.filmScreeningPermit') },
                ],
            },
            {
                title: t('processModal.entry.groundPhotoHeadline'),
                list: [{ name: t('processModal.prerequisiteItems.mediaActivityLicense') }],
            },
        ];
    }, [t]);

    useEffect(() => {
        setServicesList((prev) => {
            const next = buildServices();
            if (prev.length === next.length) {
                return next.map((item, i) => ({ ...item, check: prev[i].check }));
            }
            return next;
        });
    }, [buildServices, i18n.language]);

    useEffect(() => {
        setSpecificList((prev) => {
            const next = buildSpecific();
            if (prev.length === next.length) {
                return next.map((block, fi) => ({
                    ...block,
                    list: block.list.map((item, i) => ({
                        ...item,
                        check: prev[fi]?.list[i]?.check ?? false,
                    })),
                }));
            }
            return next;
        });
    }, [buildSpecific, i18n.language]);

    useEffect(() => {
        setEntryList(buildEntries());
    }, [buildEntries, i18n.language]);

    const onItemSelect = (i: number) => {
        const newServicesList = [...servicesList];
        newServicesList[i].check = !newServicesList[i].check;
        setServicesList(newServicesList);
    };
    const specificItemChange = (findex: number, i: number) => {
        const newSpecificList = [...specificList];
        newSpecificList[findex].list[i].check = !newSpecificList[findex].list[i].check;
        setSpecificList(newSpecificList);
    };
    const services = servicesList.map((item, i) => (
        <div className={`select-item ${item.check ? 'check-item' : ''}`} key={i}>
            <img src={item.icon} alt="" />
            <div className="item-msg">
                <div className="item-title">{item.title}</div>
                <div className="item-desc">{item.desc}</div>
            </div>
            <Checkbox checked={item.check} onChange={() => onItemSelect(i)} />
        </div>
    ));
    const specificContent = specificList.map((item, findex) => (
        <div className="specific-item" key={findex}>
            <div className="item-head">
                <img src={item.icon} alt="" />
                <div className="item-title">{item.title}</div>
            </div>
            <div className="detail-list">
                {item.list.map((detail, i) => (
                    <div className={`select-item ${detail.check ? 'check-item' : ''}`} key={i}>
                        <div className="item-msg">
                            <div className="item-title">{detail.title}</div>
                            <div className="specific-desc">{detail.desc}</div>
                        </div>
                        <Checkbox checked={detail.check} onChange={() => specificItemChange(findex, i)} />
                    </div>
                ))}
            </div>
        </div>
    ));
    const entrys = entryList.map((item) => (
        <div className="entry-list" key={item.title}>
            <div className="item-title">{item.title}</div>
            <div className="list">
                {item.list.map((entry, i) => (
                    <div className="entry-item" key={i}>
                        <div className="index-num">{i + 1}</div>
                        <div className="name">{entry.name}</div>
                        <div className="entry-detail">
                            <div className="prerequisites">{t('processModal.prerequisites')}</div>
                            <ul>
                                <li>{t('processModal.prerequisiteItems.mediaActivityLicense')}</li>
                                <li>{t('processModal.prerequisiteItems.ipCertificate')}</li>
                            </ul>
                        </div>
                        <CustomButton
                            text={t('processModal.buttons.startService')}
                            variant="primary"
                            disabled={i >= 1}
                            customClassName="star-btn"
                        />
                    </div>
                ))}
            </div>
        </div>
    ));
    const stepComponents = {
        1: <div className="service-select">{services}</div>,
        2: <div className="specific-select">{specificContent}</div>,
        3: <div className="entry-list">{entrys}</div>,
    };
    const hasSelectedWhatYouDo = servicesList.some((item) => item.check);
    const isNextDisabled = activeStep === 1 && !hasSelectedWhatYouDo;

    const modalTitle = (
        <div>
            <div>{t('processModal.title')}</div>
            <div className="process-modal__subtitle">{t('processModal.subtitle')}</div>
        </div>
    );

    const handleViewAllServices = () => {
        setUserData({
            ...userInfo,
            isGuidePageVisible: false,
        });
        void getUpdateGuidePageVisible().catch(() => undefined);
        history.push('/services');
    };
    const handleNext = () => {
        if (isNextDisabled) return;

        setActiveStep(activeStep + 1);
    };

    return (
        <Modal
            title={modalTitle}
            className="process-modal"
            wrapClassName="process-modal-root"
            centered
            destroyOnClose
            visible={show}
            onCancel={close}
            footer={
                <div className="modal-footer">
                    <div className="nomal-btn">
                        {activeStep < stepList.length ? (
                            <CustomButton
                                text={t('processModal.buttons.skip')}
                                variant="outline"
                                onClick={() => close()}
                            />
                        ) : (
                            <CustomButton
                                text={t('processModal.buttons.close')}
                                variant="outline"
                                onClick={() => close()}
                            />
                        )}
                        {activeStep < stepList.length ? (
                            <CustomButton
                                text={t('processModal.buttons.next')}
                                variant="primary"
                                disabled={isNextDisabled}
                                onClick={handleNext}
                            />
                        ) : (
                            <CustomButton
                                text={t('processModal.buttons.viewAllServices')}
                                variant="primary"
                                onClick={handleViewAllServices}
                            />
                        )}
                    </div>
                    {activeStep > 1 ? (
                        <CustomButton
                            text={t('processModal.buttons.back')}
                            variant="outline"
                            onClick={() => setActiveStep(activeStep - 1)}
                        />
                    ) : null}
                </div>
            }
        >
            <SimpleBar className="process-modal__scroll">
                <div className="process-body">
                    <div className="steps-box">
                        {stepList.map((item) => (
                            <div className="step-item" key={item.step}>
                                {item.step < activeStep ? (
                                    <img src={StepSuccess} alt="" />
                                ) : (
                                    <div className={`step-icon ${item.step <= activeStep ? 'active-icon' : ''}`}>
                                        {item.step}
                                    </div>
                                )}
                                <div className="step-text">{item.title}</div>
                                <div className={`step-line ${item.step <= activeStep ? 'active-line' : ''}`}></div>
                            </div>
                        ))}
                    </div>
                    <div className="content-box">
                        {stepComponents[activeStep as keyof typeof stepComponents]}
                    </div>
                    <div className="help-text">
                        {t('processModal.helpPrefix')} <span>{t('processModal.helpLink')}</span>
                    </div>
                </div>
            </SimpleBar>
        </Modal>
    );
};

export default ProcessModal;

import React from 'react'
import { Divider as AntdDivider } from 'antd'
import { useTranslation } from 'react-i18next'
import { preferLocalizedEnAr } from '@/utils/bilingualDisplay'
import './index.less'
export type DividerStyleType = 'solid' | 'dashed'

export interface IDesignableDividerProps {
  lineStyle?: DividerStyleType
  className?: string
  children?: React.ReactNode
  titleEn?: string
  titleAr?: string
  textEn?: string
  textAr?: string
}

export const Divider: React.FC<IDesignableDividerProps> = (props) => {
  const { lineStyle = 'solid', className, children, titleEn, titleAr, textEn, textAr, ...rest } = props
  const { i18n } = useTranslation()
  const isAr = Boolean(i18n.language?.startsWith('ar'))
  const localizedText = preferLocalizedEnAr(
    isAr,
    textEn ?? titleEn,
    textAr ?? titleAr,
  )

  const dashed = lineStyle === 'dashed'

  return (
    <div className="Formliy_AntdDivider">
      <AntdDivider dashed={dashed} className='formliy-divider' {...rest}>
        {localizedText || children}
      </AntdDivider>
    </div>
  )
}

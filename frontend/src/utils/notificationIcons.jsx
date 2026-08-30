import { Bell } from 'lucide-react'
import { TYPE_ICON } from './notificationTypeIcon'

export const NotificationIcon = ({ type, size = 18, strokeWidth = 1.6, style }) => {
  const Icon = TYPE_ICON[type] || Bell
  return <Icon size={size} strokeWidth={strokeWidth} style={style} />
}

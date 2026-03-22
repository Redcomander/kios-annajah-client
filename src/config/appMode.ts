import { ENABLE_POS } from './api'

export const MONITORING_MODE = !ENABLE_POS
export const APP_DISPLAY_NAME = MONITORING_MODE ? 'Kios Annajah Monitoring' : 'Kios Annajah Kasir'
export const APP_SHORT_NAME = MONITORING_MODE ? 'Monitoring' : 'Kasir'
export const APP_STATUS_LABEL = MONITORING_MODE ? 'Monitoring Live' : 'Online'

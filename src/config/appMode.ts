import { ENABLE_POS } from './api'

export const MONITORING_MODE = !ENABLE_POS
export const APP_DISPLAY_NAME = MONITORING_MODE ? 'Kios An-Najah Monitoring' : 'Kios An-Najah Kasir'
export const APP_SHORT_NAME = MONITORING_MODE ? 'Monitoring' : 'Kasir'
export const APP_STATUS_LABEL = MONITORING_MODE ? 'Monitoring Mode' : 'Offline Ready'

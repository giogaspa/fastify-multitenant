'use strict'

import chalk from 'chalk'

const levels = {
  debug: 0,
  info: 1,
  error: 2
}

export type LEVELS = 'debug' | 'info' | 'error'

const colors = [(l: string) => l, chalk.green, chalk.red]

export default function log(severity: LEVELS, line: string) {
  const level = levels[severity] || 0
  if (level === 1) {
    line = '--> ' + line
  }
  console.log(colors[level](line))
}

export function tableLog(data: any[]) {
  console.table(data)
}
import React, { useEffect, useRef } from 'react'
import type { BotProps } from '@typebot.io/js'
import '@typebot.io/js/dist/web'
type Props = BotProps & {
  style?: React.CSSProperties
  className?: string
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'typebot-standard': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { class?: string }
    }
  }
}

type StandardElement = HTMLElement & Props

export const Standard = ({ style, className, ...assignableProps }: Props) => {
  console.log("standard callledddd");
  const ref = useRef<StandardElement | null>(null)
  
  useEffect(() => {
    if (!ref.current) return
    Object.assign(ref.current, assignableProps)
  }, [assignableProps])

  return <typebot-standard ref={ref} style={style} class={className} />
}

export default Standard





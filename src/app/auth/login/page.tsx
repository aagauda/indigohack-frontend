import { LoginForm } from '@/components/auth/login-form'
import React from 'react'

type Props = {}

function page({}: Props) {
  return (
    <div>
      Please Login Here
      <LoginForm/>
    </div>
  )
}

export default page
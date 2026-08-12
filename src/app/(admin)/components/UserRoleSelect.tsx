"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import updateUserRole from "../mutations/updateUserRole"

export function UserRoleSelect({
  userId,
  role,
  canEdit,
}: {
  userId: number
  role: string
  canEdit: boolean
}) {
  const [update, { isLoading }] = useMutation(updateUserRole)
  const router = useRouter()

  if (!canEdit) {
    return <span className="badge badge-outline">{role}</span>
  }

  return (
    <select
      className="select select-bordered select-sm"
      defaultValue={role}
      disabled={isLoading}
      onChange={async (e) => {
        await update({ userId, role: e.target.value as "USER" | "ADMIN" | "SUPER_ADMIN" })
        router.refresh()
      }}
    >
      <option value="USER">USER</option>
      <option value="ADMIN">ADMIN</option>
      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
    </select>
  )
}

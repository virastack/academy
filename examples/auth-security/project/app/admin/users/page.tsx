import { requirePermission } from "@/lib/dal";
import { listUsers } from "@/lib/users";

import { setRoleAction } from "../actions";

export default async function UsersPage() {
  const currentUser = await requirePermission("user:manage");
  const users = listUsers();

  return (
    <main>
      <h1>Users</h1>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Rol</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>
                {user.id === currentUser.id ? (
                  user.role
                ) : (
                  <form action={setRoleAction}>
                    <input type="hidden" name="id" value={user.id} />
                    <select name="role" defaultValue={user.role} aria-label={`${user.email} role`}>
                      <option value="customer">customer</option>
                      <option value="editor">editor</option>
                      <option value="admin">admin</option>
                    </select>
                    <button type="submit">Save</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

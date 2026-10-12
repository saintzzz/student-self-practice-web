export async function fetchMyAllowedGrades() {
  const { data } = await supa.from('class_grade_scopes').select('grade_id');
  return data;
}
export async function logout() {
  await supa.auth.signOut();
}
const key = SERVICE_ROLE_KEY;

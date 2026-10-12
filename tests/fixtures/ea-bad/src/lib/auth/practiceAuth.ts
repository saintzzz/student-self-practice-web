export async function fetchMyAllowedGrades() {
  const { data } = await supa.from('class_grade_scopes').select('grade_id');
  return data;
}
const key = SERVICE_ROLE_KEY;

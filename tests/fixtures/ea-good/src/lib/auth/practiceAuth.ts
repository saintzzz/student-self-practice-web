export async function fetchMyAllowedGrades() {
  const enr = await supa.from('enrollments').select('class_id').eq('student_id', uid);
  const { data } = await supa.from('class_grade_scopes').select('grade_id').in('class_id', enr);
  return data;
}
export async function logout() {
  const { error } = await supa.auth.signOut();
  if (error) throw error;
}

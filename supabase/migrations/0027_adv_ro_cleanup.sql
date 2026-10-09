-- CR-63: gen-advanced-bank id fix tao id moi cho item reorder (truoc do
-- hash 'undefined'). Xoa 5 row reorder mang id cu - noi dung da co ban
-- moi voi id dung; giu ca hai se lam cau bi lap trong bank.
delete from practice.qb_questions
where id in (
  'g1-english-adv-769b6c52b1d1',
  'g2-english-adv-048f9faf2777',
  'g3-english-adv-2b76d586c781',
  'g4-english-adv-e3c7e299fc19',
  'g5-english-adv-8e8f1edf0477'
);

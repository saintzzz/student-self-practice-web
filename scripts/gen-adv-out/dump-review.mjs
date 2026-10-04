// Dump authored advanced items for manual review.
const files = {
  english: await import('../gen-adv/items-english.mjs'),
  math: await import('../gen-adv/items-math.mjs'),
  science: await import('../gen-adv/items-science.mjs'),
};
for (const [subj, mod] of Object.entries(files)) {
  const items = mod.default ?? Object.values(mod).find(Array.isArray);
  console.log(`\n===== ${subj.toUpperCase()} (${items.length}) =====`);
  items.forEach((it, i) => {
    const ch = it.c ? it.c.map((c, j) => (j === it.a ? `*${c}*` : c)).join(' | ') : '-';
    console.log(`${i + 1}. g${it.g} [${it.skill}] d${it.d} ${it.q ?? it.statement ?? ''}`);
    if (it.passage) console.log(`   passage: ${it.passage}`);
    if (it.bool !== undefined) console.log(`   answer: ${it.bool ? 'True' : 'False'}`);
    if (it.c) console.log(`   choices: ${ch}`);
    if (it.ro) console.log(`   tokens: ${(it.tokens ?? []).join(' ')} -> ${it.text ?? ''}`);
    console.log(`   ex: ${it.ex}`);
  });
}

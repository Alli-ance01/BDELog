export function orderTemplate(categories = [], questions = []) {
  const categoryOrder = new Map(categories.map((category) => [String(category._id), category.order ?? 0]));
  return [...questions].sort((left, right) => {
    const leftCategory = categoryOrder.get(String(left.categoryId)) ?? Number.MAX_SAFE_INTEGER;
    const rightCategory = categoryOrder.get(String(right.categoryId)) ?? Number.MAX_SAFE_INTEGER;
    return leftCategory - rightCategory || (left.order ?? 0) - (right.order ?? 0) || new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
  });
}

export function groupTemplate(categories = [], questions = []) {
  return categories.map((category) => ({
    ...category,
    questions: questions.filter((question) => String(question.categoryId || '') === String(category._id)),
  }));
}

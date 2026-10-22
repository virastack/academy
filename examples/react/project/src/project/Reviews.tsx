import { use, useActionState, useOptimistic } from "react";
import { useFormStatus } from "react-dom";
import { postReview, type Review } from "./api.ts";
import { fetchReviews } from "./cache.ts";

type ReviewState = { reviews: Review[]; error: string | null };

export function Reviews({ productId }: { productId: string }) {
  const initialReviews = use(fetchReviews(productId));

  const [state, dispatchReview] = useActionState(
    async (previous: ReviewState, text: string): Promise<ReviewState> => {
      if (text.length < 3) {
        return { ...previous, error: "Yorum en az 3 karakter olmalı." };
      }
      const saved = await postReview(productId, { author: "Siz", text });
      return { reviews: [...previous.reviews, saved], error: null };
    },
    { reviews: initialReviews, error: null },
  );

  const [optimisticReviews, addOptimisticReview] = useOptimistic(
    state.reviews,
    (reviews: Review[], pending: Review) => [...reviews, pending],
  );

  function submitReview(formData: FormData) {
    const text = String(formData.get("text")).trim();
    if (text.length >= 3) {
      addOptimisticReview({ id: -1, author: "Siz", text });
    }
    dispatchReview(text);
  }

  return (
    <section>
      <ul>
        {optimisticReviews.map((review) => (
          <li key={review.id} style={{ opacity: review.id === -1 ? 0.5 : 1 }}>
            <strong>{review.author}:</strong> {review.text}
          </li>
        ))}
      </ul>
      <form action={submitReview}>
        <textarea name="text" aria-label="Yorumunuz" />
        {state.error && <p role="alert">{state.error}</p>}
        <SubmitButton />
      </form>
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Gönderiliyor..." : "Yorum yap"}</button>;
}

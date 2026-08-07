import React from 'react';
import { Link } from 'react-router-dom';
import { useGetSellerDashboardQuery } from '../../../services/marketplaceApi';

export const SellerLearningPage: React.FC = () => {
  const { data, isLoading } = useGetSellerDashboardQuery();
  const articles = data?.learningArticles || [];

  if (isLoading) {
    return <p className="text-slate-500">Cargando...</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-or-navy">Centro de aprendizaje</h2>
        <p className="text-sm text-slate-500 mt-1">
          Consejos prácticos para vender mejor en OrigenRed.
        </p>
      </div>

      <div className="space-y-4">
        {articles.map((article) => (
          <article
            key={article.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
          >
            <h3 className="font-semibold text-or-navy">{article.title}</h3>
            <p className="text-sm text-slate-600">{article.summary}</p>
            <ul className="text-sm text-slate-500 space-y-1.5 list-disc pl-5">
              {article.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <Link to="/vendedor" className="text-sm text-or-blue font-medium hover:underline">
        ← Volver al resumen
      </Link>
    </div>
  );
};

// … imports et code identiques au tien …

// Dans le rendu JSX de PlayerProfileProfileTab, section Race:
<SectionContainer
  icon={<Shield size={18} className="text-emerald-400" />}
  title="Espèce"                      // ← remplace "Race" par "Espèce"
  subtitle={race || undefined}
  defaultOpen={false}
>
  {racesIdx.loading ? (
    <LoadingInline />
  ) : racesIdx.error ? (
    <div className="text-sm text-red-400">
      Erreur de chargement des espèces: {racesIdx.error}  {/* ← "races" -> "espèces" (copie UI seulement) */}
    </div>
  ) : raceSection ? (
    <>
      <div className="text-base font-semibold mb-2">{renderInline(raceSection.title)}</div>
      <MarkdownLite content={raceSection.content} />
    </>
  ) : (
    <NotFound label="Espèce" value={race} />              {/* ← "Race" -> "Espèce" */}
  )}
</SectionContainer>

// … reste du composant inchangé …
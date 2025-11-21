import { TagRulesManager } from '@/components/features/tags/TagRulesManager'

export default function TagsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tag Rules</h2>
          <p className="text-muted-foreground">Automatically tag transactions with custom rules</p>
        </div>
      </div>
      <TagRulesManager />
    </div>
  )
}

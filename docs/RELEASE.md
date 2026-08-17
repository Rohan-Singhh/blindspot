# Release checklist

- [ ] `npm install`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `git diff --check`
- [ ] `npm pack --dry-run --workspace @blindspot/cli`
- [ ] Install/test the packed CLI tarball
- [ ] Verify `blindspot --help` and `blindspot --version`
- [ ] Verify normal and JSON scans
- [ ] Verify high/critical and clean exit codes
- [ ] Do not run `npm publish` as part of this checklist

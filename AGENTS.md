# Repository instructions

This repository maintains reusable agent instructions, a hand picked collection of other peoples instructions and personal adaptations of them. APM distributes it all.

## Maintained sources

- Maintain external selections in `apm.yml` and exact resolutions in `apm.lock.yaml`.
- Keep dependency revisions unchanged unless the task explicitly includes upgrades.

## Safety and completion

- Do not install globally, edit user runtime configuration, change existing installations or migrate another repository without an explicit request for that action.
- Run distribution checks in a disposable home and consumer project.
- Verify local skills, their supporting files, external skill selections and target-specific instruction output through actual APM consumer installation.
- Keep credentials, personal profiles, work information, session histories and machine-specific paths out of distributed content.

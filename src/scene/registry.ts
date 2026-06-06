import { arrayCompiler } from './compilers/arrayCompiler'
import { dequeCompiler } from './compilers/dequeCompiler'
import { graphCompiler } from './compilers/graphCompiler'
import { linkedListCompiler } from './compilers/linkedListCompiler'
import { mapCompiler } from './compilers/mapCompiler'
import { matrixCompiler } from './compilers/matrixCompiler'
import { pointerCompiler } from './compilers/pointerCompiler'
import { queueCompiler } from './compilers/queueCompiler'
import { setCompiler } from './compilers/setCompiler'
import { stackCompiler } from './compilers/stackCompiler'
import { stringCompiler } from './compilers/stringCompiler'
import { treeCompiler } from './compilers/treeCompiler'

export const sceneCompilers = [pointerCompiler, linkedListCompiler, treeCompiler, arrayCompiler, matrixCompiler, graphCompiler, stackCompiler, queueCompiler, stringCompiler, setCompiler, mapCompiler, dequeCompiler]

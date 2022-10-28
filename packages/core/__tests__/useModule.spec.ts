import { reactive } from 'vue'
import { defineController, defineInterface, defineModule, defineProvider, useModule } from '../index'

describe('use module', () => {
  const IP1 = defineInterface<{ do1: () => string }>()
  const IP2 = defineInterface<{ do2: () => string }>()

  const p1 = defineProvider().implements(IP1).setup(() => ({
    do1() { return 'STR' }
  }), { singleton: true })

  const p2 = defineProvider().implements(IP2).inject(IP1).setup(p1 => ({
    do2: p1.do1
  }))

  it('should have controller method in module', () => {
    const IC = defineInterface<{ do: (v: string) => string }>()

    const c = defineController().implements(IC).inject(IP1, IP2).setup((p1, p2) => {
      return {
        do(v) {
          if (typeof v === 'string')
            return p1.do1()
          return p2.do2()
        }
      }
    })

    const m = defineModule({ controller: c, providers: [p1, p2] })

    const { do: mDo } = useModule(m)

    expect(mDo('')).toBe('STR')
  })

  it('should have only one instance in same provider', async () => {
    interface SignInDto {
      username: string
      password: string
    }

    interface SignInResDto extends SignInDto {
      token: string
    }

    const IUserRep = defineInterface<{
      signIn(data: SignInDto): Promise<SignInResDto>
    }>()

    const IUserService = defineInterface<{
      signIn(data: SignInDto): Promise<SignInResDto>
    }>()

    const userRep = defineProvider().implements(IUserRep).setup(() => ({
      signIn(data: SignInDto) {
        return Promise.resolve({ token: 'TOKEN', ...data })
      }
    }))

    const userService = defineProvider().implements(IUserService).inject(IUserRep).setup(rep => ({
      signIn(data) {
        return rep.signIn(data)
      }
    }))

    const IUserController = defineInterface<{
      usernameSignInForm: {
        username: string
        password: string
      }

      signIn: () => Promise<SignInResDto>
    }>()

    const userController = defineController().implements(IUserController).inject(IUserService).setup((userService) => {
      const usernameSignInForm = reactive({ username: '', password: '' })

      const signIn = () => {
        return userService.signIn(usernameSignInForm)
      }

      return {
        usernameSignInForm,
        signIn
      }
    })

    const userModule = defineModule({
      controller: userController,
      providers: [userService, userRep]
    })

    const { signIn } = useModule(userModule)

    expect((await signIn()).token).toBe('TOKEN')
  })
})
